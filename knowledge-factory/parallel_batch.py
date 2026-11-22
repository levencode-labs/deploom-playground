#!/usr/bin/env python3
"""Parallel, explicitly paid Agents API session dispatcher with bounded spending.

The OpenAI-hosted agents do the research; this lightweight controller only
submits independent SHA-pinned tasks. No key enters the sandbox or Git logs.
Default invocation is an offline dry run and spends ZERO API credits.

All tasks remain unverified until a separate independent CI reproduces
positive *and* negative controls. A completed agent turn is not migration PASS.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from decimal import Decimal
from pathlib import Path
from types import SimpleNamespace

import run_batch as single

MAX_WORKERS = 8
MAX_BATCH_SESSIONS = 80


def _is_uncapped(args):
    return (getattr(args, "allow_uncapped_session", False)
            or getattr(args, "allow_uncapped_batch", False))


def _parameters(data, args):
    if not isinstance(data, dict) or not isinstance(data.get("tasks"), list):
        raise ValueError("Unvalidated source-exact corpus")
    if not 1 <= args.max_sessions <= MAX_BATCH_SESSIONS:
        raise ValueError("Session count outside 1..80")
    if not 1 <= args.workers <= MAX_WORKERS:
        raise ValueError("Parallel worker count outside 1..8")
    if getattr(args, "allow_uncapped_session", False) and getattr(args, "allow_uncapped_batch", False):
        raise ValueError("Choose exactly one uncapped mode")
    if getattr(args, "allow_uncapped_session", False) and (
            args.max_sessions != 1 or args.workers != 1):
        raise ValueError("Uncapped opt-in requires exactly one session and one worker")
    if getattr(args, "allow_uncapped_batch", False):
        if not (2 <= args.max_sessions <= 80 and 1 <= args.workers <= 4):
            raise ValueError("Uncapped batch requires 2..80 tasks and at most 4 workers")
        if args.model not in ("gpt-6.2-sol", "gpt-6-luna"):
            raise ValueError("Uncapped batch requires Sol or Luna model")
    if not 60 <= args.timeout <= 3600:
        raise ValueError("Invalid per-session timeout")
    offset = getattr(args, "offset", 0)
    if type(offset) is not int or not 0 <= offset < len(data["tasks"]):
        raise ValueError("Invalid source-exact task offset")
    tasks = data["tasks"][offset:offset + args.max_sessions]
    if not tasks or len({task["id"] for task in tasks}) != len(tasks):
        raise ValueError("Missing or duplicate source-exact tasks")
    if getattr(args, "allow_uncapped_batch", False) and len(tasks) != args.max_sessions:
        raise ValueError("Uncapped batch cannot silently truncate requested task count")
    unit = single.reserve(args.budget_usd, args.reserve_usd, len(tasks))
    return tasks, unit


def plan(data, args):
    tasks, unit = _parameters(data, args)
    return {
        "schema": 1, "status": "DRY_RUN_ZERO_CREDITS",
        "sourceBatch": data["batch"], "sourceCorpusSha256": single.sha(single.encode(data)),
        "selectedSessions": len(tasks), "offset": getattr(args, "offset", 0),
        "workers": min(args.workers, len(tasks)),
        "model": args.model, "maxWallClockSecondsPerAgent": args.timeout,
        "uncappedMultiSessionBatch": bool(getattr(args, "allow_uncapped_batch", False)),
        "subagentsDisabled": bool(getattr(args, "allow_uncapped_batch", False)
                                  or args.model == "gpt-6-luna"),
        "spendLimitPerSessionCents": (None if _is_uncapped(args)
                                       else int(unit * 100)),
        "apiSpendControlMode": ("UNLIMITED_EXPLICIT_OPT_IN"
                                if _is_uncapped(args)
                                else "CAPPED_REQUIRED"),
        "localBudgetIsNotApiSpendCap": True,
        "plannedReservationsUsd": str(unit * len(tasks)),
        "ceilingUsd": args.budget_usd,
        "tasks": [{"id": task["id"], "sourceCommit": task["sha"],
                   "promptSha256": single.sha(single.prompt(task).encode())}
                  for task in tasks],
        "note": ("No task executed. UNLIMITED session API spend; local $2 "
                 "reservation is NOT a spending ceiling." if _is_uncapped(args)
                 else "No task has been executed or independently verified."),
    }


def _one(data, task, args, unit, send):
    """Use the source-exact single-session controller's pre-call receipt."""
    one = {"schema": 1, "batch": data["batch"], "tasks": [task]}
    local = SimpleNamespace(
        execute=True, max_sessions=1, budget_usd=str(unit), reserve_usd=str(unit),
        output=args.output, model=args.model, timeout=args.timeout,
        allow_uncapped_session=_is_uncapped(args),
        disable_subagents=getattr(args, "allow_uncapped_batch", False),
    )
    try:
        return single.run(one, local, send=send)[0]
    except Exception as exc:
        # Never expose exception text: API clients may include credentials in it.
        # Any receipt made before a paid call remains on disk, preventing retries.
        return {"schema": 1, "task": task["id"], "repository": task["repository"],
                "commit": task["sha"], "state": "controller-error",
                "errorKind": type(exc).__name__, "migrationVerdict": "UNKNOWN"}


def accepted_turn(receipt):
    """Only controls scheduling; does NOT certify a migration."""
    return (receipt.get("turnOutcome") == "completed"
            and receipt.get("artifactEvidence", {}).get("status") == "complete"
            and receipt.get("state") == "agent-turn-reported")


def execute(data, args, *, send=None):
    tasks, unit = _parameters(data, args)
    if send is None:
        send = (single.agent_session_uncapped_opt_in
                if _is_uncapped(args)
                else single.agent_session_with_staged_cap)
    if not args.execute:
        raise ValueError("Paid execution requires explicit --execute")
    if not os.environ.get("OPENAI_API_KEY"):
        raise ValueError("OPENAI_API_KEY absent in controller; no sessions launched")

    # Validate entire reservation BEFORE submitting a single chargeable task.
    output = Path(args.output) / data["batch"]
    output.mkdir(parents=True, exist_ok=True)
    offset = getattr(args, "offset", 0)
    summary = output / ("parallel-summary.json" if offset == 0
                        else "parallel-summary-offset-" + str(offset).zfill(3) + ".json")
    if summary.exists():
        raise ValueError("Existing summary requires separate reconciliation before new paid run")

    if getattr(args, "allow_uncapped_batch", False):
        existing = [task["id"] for task in tasks
                    if (output / (task["id"] + ".json")).exists()]
        if existing:
            raise ValueError("Uncapped batch includes existing attempted tasks; choose an unused offset")
    selected = tasks
    results = {}
    stop_new = False
    next_index = 0
    launched = 0
    max_workers = min(len(selected), args.workers)
    with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="deploom-cloud") as pool:
        inflight = {}

        def submit():
            nonlocal next_index, launched
            task = selected[next_index]
            next_index += 1
            launched += 1
            future = pool.submit(_one, data, task, args, unit, send)
            inflight[future] = task

        while next_index < max_workers:
            submit()
        while inflight:
            finished, _ = wait(set(inflight), return_when=FIRST_COMPLETED)
            for future in finished:
                task = inflight.pop(future)
                receipt = future.result()
                results[task["id"]] = receipt
                if not accepted_turn(receipt):
                    stop_new = True
            while not stop_new and len(inflight) < max_workers and next_index < len(selected):
                submit()
            # A missing or malformed published artifact blocks further spending
            # without discarding already-running independent tasks.

    ordered = [results[task["id"]] for task in selected if task["id"] in results]
    report = {
        "schema": 1, "status": "AGENT_SESSIONS_ONLY_NOT_INDEPENDENT_CI",
        "sourceBatch": data["batch"], "sourceCorpusSha256": single.sha(single.encode(data)),
        "selectedSessions": len(selected), "offset": offset,
        "sessionsLaunched": launched,
        "sessionReceipts": len(ordered), "sessionCompletions": sum(accepted_turn(x) for x in ordered),
        "unlaunched": [task["id"] for task in selected[next_index:]],
        "stoppedOnUncertainEvidence": stop_new,
        "workers": max_workers,
        "model": args.model, "maxWallClockSecondsPerAgent": args.timeout,
        "uncappedMultiSessionBatch": bool(getattr(args, "allow_uncapped_batch", False)),
        "subagentsDisabled": bool(getattr(args, "allow_uncapped_batch", False)
                                  or args.model == "gpt-6-luna"),
        "spendLimitPerSessionCents": (None if _is_uncapped(args)
                                       else int(unit * 100)),
        "apiSpendControlMode": ("UNLIMITED_EXPLICIT_OPT_IN"
                                if _is_uncapped(args)
                                else "CAPPED_REQUIRED"),
        "localBudgetIsNotApiSpendCap": True,
        "plannedReservationsUsd": str(unit * len(selected)),
        "launchedReservationsUsd": str(unit * launched),
        "ceilingUsd": args.budget_usd,
        "results": [
            {"task": r.get("task"), "state": r.get("state"),
             "turnOutcome": r.get("turnOutcome", "UNKNOWN"),
             "artifactStatus": r.get("artifactEvidence", {}).get("status", "UNKNOWN"),
             "sessionId": r.get("sessionId"),
             "migrationVerdict": "UNKNOWN"}
            for r in ordered
        ],
        "verifiedKnowledgeCards": 0,
        "independentVerification": "NOT_RUN",
    }
    single.atomic(summary, report)
    return report


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["plan", "run"])
    parser.add_argument("--corpus", type=Path,
                        default=single.ROOT / "corpus/projects.lock.json")
    parser.add_argument("--output", type=Path, default=single.ROOT / ".runs")
    parser.add_argument("--model", choices=("gpt-6.2-sol", "gpt-6-luna", "gpt-6-astra"),
                        default="gpt-6.2-sol")
    parser.add_argument("--max-sessions", type=int, default=8)
    parser.add_argument("--offset", type=int, default=0,
                        help="Zero-based starting position in the immutable source-exact queue")
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--timeout", type=int, default=1800)
    parser.add_argument("--budget-usd", default="16")
    parser.add_argument("--reserve-usd", default="2")
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--allow-uncapped-session", action="store_true",
                        help="One uncapped paid API session only; local reservation is NOT an API limit")
    parser.add_argument("--allow-uncapped-batch", action="store_true",
                        help="Explicit 2..80 uncapped sessions, <=4 workers")
    args = parser.parse_args(argv)
    try:
        data = single.corpus(args.corpus)
        result = (plan(data, args) if args.command == "plan"
                  else execute(data, args))
    except (ValueError, OSError, KeyError) as exc:
        parser.error(str(exc))
    print(json.dumps(result, sort_keys=True, indent=2))
    if args.command == "plan":
        return 0
    return 0 if result["sessionsLaunched"] == result["sessionCompletions"] == result["selectedSessions"] else 2


if __name__ == "__main__":
    sys.exit(main())
