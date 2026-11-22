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
import threading
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
        stop_requested=getattr(args, "stop_requested", None),
    )
    try:
        return single.run(one, local, send=send)[0]
    except Exception as exc:
        # Never expose exception text: API clients may include credentials in it.
        # Any receipt made before a paid call remains on disk, preventing retries.
        return {"schema": 1, "task": task["id"], "repository": task["repository"],
                "commit": task["sha"], "state": "controller-error",
                "errorKind": type(exc).__name__, "migrationVerdict": "UNKNOWN"}


def receipt_disposition(receipt):
    """Classify a receipt without inferring success from mere session creation.

    A failed or cancelled root turn is a completed *API attempt*, not a
    successful migration. It may be skipped safely because it is already
    terminal and cannot continue consuming tokens. Anything else is UNKNOWN.
    """
    if not isinstance(receipt, dict) or receipt.get("state") != "agent-turn-reported":
        return "UNKNOWN"
    outcome = receipt.get("turnOutcome")
    if outcome not in ("completed", "failed", "cancelled"):
        return "UNKNOWN"
    sid, tid = receipt.get("sessionId"), receipt.get("turnId")
    if not isinstance(sid, str) or not single.SAFE_REF.fullmatch(sid):
        return "UNKNOWN"
    if not isinstance(tid, str) or not single.SAFE_REF.fullmatch(tid):
        return "UNKNOWN"
    if outcome == "failed":
        return "FAILED_TERMINAL"
    if outcome == "cancelled":
        return "CANCELLED_TERMINAL"
    if receipt.get("artifactEvidence", {}).get("status") == "complete":
        return "COMPLETED_WITH_ARTIFACTS"
    return "COMPLETED_ARTIFACTS_MISSING"


def accepted_turn(receipt):
    """Old compatibility helper; only artifacts + completed root count."""
    return receipt_disposition(receipt) == "COMPLETED_WITH_ARTIFACTS"


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

    output = Path(args.output) / data["batch"]
    output.mkdir(parents=True, exist_ok=True)
    offset = getattr(args, "offset", 0)
    summary = output / ("parallel-summary.json" if offset == 0
                        else "parallel-summary-offset-" + str(offset).zfill(3) + ".json")
    if summary.exists():
        raise ValueError("Existing summary requires separate reconciliation before new paid run")
    if getattr(args, "allow_uncapped_batch", False):
        existing = [task["id"] for task in tasks
                    if (output / (task["id"] + ".json")).exists()
                    or (Path(args.output) / "claims" / (task["id"] + ".json")).exists()]
        if existing:
            raise ValueError("Uncapped batch includes existing attempted tasks/claims; "
                             "reconcile and select only never-launched tasks")

    selected = tasks
    results = {}
    unknown_seen = False
    stop_new = False
    interrupted = False
    launched = 0
    next_index = 0
    stop_requested = threading.Event()
    # Keep original args untouched across test runs. Each worker gets one
    # immutable shared signal that is checked while its agent is active.
    worker_args = SimpleNamespace(**vars(args))
    worker_args.stop_requested = stop_requested
    max_workers = min(len(selected), args.workers)

    def report(state):
        dispositions = {tid: receipt_disposition(r) for tid, r in results.items()}
        counts = {
            "completed": sum(x == "COMPLETED_WITH_ARTIFACTS" for x in dispositions.values()),
            "failed": sum(x == "FAILED_TERMINAL" for x in dispositions.values()),
            "cancelled": sum(x == "CANCELLED_TERMINAL" for x in dispositions.values()),
            "unknown": sum(x in ("UNKNOWN", "COMPLETED_ARTIFACTS_MISSING")
                           for x in dispositions.values()),
        }
        summary_doc = {
            "schema": 1, "status": state, "sourceBatch": data["batch"],
            "sourceCorpusSha256": single.sha(single.encode(data)),
            "selectedSessions": len(selected), "offset": offset,
            "sessionsLaunched": launched,
            "sessionReceipts": len(results),
            "sessionCompletions": counts["completed"],
            "completed": counts["completed"], "failed": counts["failed"],
            "cancelled": counts["cancelled"], "unknown": counts["unknown"],
            "recovered": 0,
            "verifiedArtifacts": counts["completed"],
            "unlaunched": [t["id"] for t in selected[next_index:]],
            "stoppedOnUncertainEvidence": unknown_seen,
            "stoppedOnInterrupt": interrupted,
            "workers": max_workers,
            "model": args.model, "maxWallClockSecondsPerAgent": args.timeout,
            "uncappedMultiSessionBatch": bool(getattr(args, "allow_uncapped_batch", False)),
            "subagentsDisabled": bool(getattr(args, "allow_uncapped_batch", False)
                                      or args.model == "gpt-6-luna"),
            "spendLimitPerSessionCents": (None if _is_uncapped(args)
                                         else int(unit * 100)),
            "apiSpendControlMode": ("UNLIMITED_EXPLICIT_OPT_IN"
                                    if _is_uncapped(args) else "CAPPED_REQUIRED"),
            "localBudgetIsNotApiSpendCap": True,
            "plannedReservationsUsd": str(unit * len(selected)),
            "launchedReservationsUsd": str(unit * launched),
            "ceilingUsd": args.budget_usd,
            "results": [
                {"task": task["id"], "state": results[task["id"]].get("state"),
                 "turnOutcome": results[task["id"]].get("turnOutcome", "UNKNOWN"),
                 "artifactStatus": results[task["id"]].get("artifactEvidence", {}).get(
                     "status", "UNKNOWN"),
                 "sessionId": results[task["id"]].get("sessionId"),
                 "disposition": dispositions[task["id"]],
                 "migrationVerdict": "UNKNOWN"}
                for task in selected if task["id"] in results
            ],
            "verifiedKnowledgeCards": 0, "independentVerification": "NOT_RUN",
        }
        # Rewrite the *derived* summary atomically; immutable per-task
        # receipts and cross-batch claims remain untouched.
        single.atomic(summary, summary_doc)
        return summary_doc

    report("RUNNING_NO_TASKS_COMPLETED")
    with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="deploom-cloud") as pool:
        inflight = {}

        def submit():
            nonlocal next_index, launched
            task = selected[next_index]
            next_index += 1
            launched += 1
            future = pool.submit(_one, data, task, worker_args, unit, send)
            inflight[future] = task

        while next_index < max_workers:
            submit()
        report("RUNNING")
        while inflight:
            try:
                finished, _ = wait(set(inflight), timeout=5,
                                   return_when=FIRST_COMPLETED)
            except KeyboardInterrupt:
                # First Ctrl+C means stop submitting new tasks and ask every
                # known active agent to cancel itself server-side. Do not
                # terminate local workers and strand cloud sessions.
                interrupted = True
                stop_new = True
                stop_requested.set()
                print("[KnowledgeFactory] Ctrl+C: draining active sessions; "
                      "server cancellation requested, no new tasks.",
                      file=sys.stderr, flush=True)
                report("INTERRUPTING_DRAINING")
                continue
            if not finished:
                continue
            for future in finished:
                task = inflight.pop(future)
                try:
                    receipt = future.result()
                except Exception as exc:
                    # No raw exception text may reach public logs.
                    receipt = {"schema": 1, "task": task["id"],
                               "state": "controller-error",
                               "errorKind": type(exc).__name__,
                               "migrationVerdict": "UNKNOWN"}
                results[task["id"]] = receipt
                disposition = receipt_disposition(receipt)
                if disposition in ("UNKNOWN", "COMPLETED_ARTIFACTS_MISSING"):
                    unknown_seen = True
                    stop_new = True
                # FAILED_TERMINAL/CANCELLED_TERMINAL are safely skipped.
                # Neither can be retried or count as migration PASS.
                report("RUNNING" if not stop_new else
                       ("INTERRUPTING_DRAINING" if interrupted else "HALTING_DRAINING"))
            while not stop_new and len(inflight) < max_workers and next_index < len(selected):
                submit()
            report("RUNNING" if not stop_new else "HALTING_DRAINING")

    final_state = ("HALTED_UNCONFIRMED" if unknown_seen else
                   "INTERRUPTED_RECONCILED" if interrupted else
                   "PROCESSED_WITH_TERMINAL_FAILURES" if
                   any(receipt_disposition(r) in
                       ("FAILED_TERMINAL", "CANCELLED_TERMINAL") for r in results.values())
                   else "PROCESSED_ALL_WITH_ARTIFACTS")
    return report(final_state)


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
    # Exit 0 means that the *queue* is entirely reconciled, not that every
    # migration succeeded. Terminal failures are explicitly in the summary.
    return (0 if result["status"] in
            ("PROCESSED_ALL_WITH_ARTIFACTS", "PROCESSED_WITH_TERMINAL_FAILURES")
            and not result["unlaunched"] else 2)


if __name__ == "__main__":
    sys.exit(main())
