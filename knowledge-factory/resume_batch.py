#!/usr/bin/env python3
"""Resume only never-launched pinned public projects, without manual offsets.

Default = offline plan, zero billable calls. An actual run requires --execute
and a local OpenAI API key, performs read-only live reconciliation first,
and uses the same immutable per-task claims + server cancellation as the
regular dispatcher. Previous FAILED, COMPLETED or UNKNOWN never auto-retry.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "research"))
import combine_batches
import parallel_batch as parallel
import reconcile_batch as reconcile
import run_batch as agent


def eligible_queue(original, *, output, online=False, key=None,
                   max_sessions=80, model="gpt-6-luna", get=None, attest=None):
    if not 1 <= max_sessions <= 80:
        raise ValueError("Resume queue limit outside 1..80")
    if model not in ("gpt-6-luna", "gpt-6.2-sol"):
        raise ValueError("Resume only permits approved lower-cost research models")
    scan = reconcile.census(original, output, online=online, key=key,
                            get=get, attest=attest)
    by_id = {r["task"]: r for r in scan["rows"]}
    # A known unconfirmed running session could still be billable, so never
    # overlap a new wave while its status is unresolved.
    if online:
        blocked = [r["task"] for r in scan["rows"]
                   if r["status"] in ("UNKNOWN_CONFLICT", "UNKNOWN_CLAIMED")
                   or (r["status"] == "UNKNOWN_ACTIVE"
                       and (not isinstance(r.get("live"), dict)
                            or r["live"].get("liveStatus") not in
                            ("NO_OBSERVED_ROOT_TURN",)))]
        if blocked:
            raise ValueError("Existing cloud sessions/claims remain unresolved; "
                             "reconcile before starting a new paid wave")
    fresh = [t for t in original["tasks"] if by_id[t["id"]]["status"] == "NOT_LAUNCHED"]
    chosen = fresh[:max_sessions]
    digest = agent.sha(agent.encode({
        "corpusSha256": scan["sourceCorpusSha256"], "model": model,
        "tasks": [{"id": t["id"], "sha": t["sha"]} for t in chosen]
    }))
    batch = {"schema": 1, "batch": "research-resume-" + digest[:16],
             "tasks": chosen}
    return batch, scan


def plan_output(batch, scan, *, model, workers, timeout):
    return {
        "schema": 1,
        "status": "RESUME_DRY_RUN_ZERO_CREDITS",
        "model": model,
        "workers": workers,
        "timeoutSecondsPerSession": timeout,
        "maxSpend": "NO_API_SPENDING_CAP",
        "sourceCorpusSha256": scan["sourceCorpusSha256"],
        "candidateBatch": batch["batch"],
        "eligibleRemainingAcrossCorpus": scan["neverLaunched"],
        "selectedSessions": len(batch["tasks"]),
        "tasks": [{"task": t["id"], "sourceCommit": t["sha"]}
                  for t in batch["tasks"]],
        "reconciliationCounts": scan["counts"],
        "automaticRetries": 0,
        "independentVerification": "NOT_RUN",
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("plan", "run"))
    parser.add_argument("--output", type=Path, default=agent.ROOT / ".runs")
    parser.add_argument("--model", default="gpt-6-luna",
                        choices=("gpt-6-luna", "gpt-6.2-sol"))
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--timeout", type=int, default=1800)
    parser.add_argument("--max-sessions", type=int, default=80)
    parser.add_argument("--execute", action="store_true")
    args = parser.parse_args(argv)
    if not 1 <= args.workers <= 4 or not 60 <= args.timeout <= 3600:
        parser.error("Invalid worker count or per-agent timeout")
    if args.command == "run" and not args.execute:
        parser.error("Paid resume requires explicit --execute")
    key = os.environ.get("OPENAI_API_KEY") if args.command == "run" else None
    if args.command == "run" and not key:
        parser.error("OPENAI_API_KEY required locally for paid resume")
    original = combine_batches.combined()
    try:
        batch, scan = eligible_queue(
            original, output=args.output, online=args.command == "run",
            key=key, max_sessions=args.max_sessions, model=args.model)
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    plan = plan_output(batch, scan, model=args.model,
                       workers=args.workers, timeout=args.timeout)
    if args.command == "plan" or not batch["tasks"]:
        print(json.dumps(plan, sort_keys=True, indent=2))
        return 0
    if len(batch["tasks"]) == 1:
        single = True
        workers = 1
    else:
        single = False
        workers = min(args.workers, len(batch["tasks"]))
    request = SimpleNamespace(
        execute=True, max_sessions=len(batch["tasks"]), workers=workers,
        offset=0, output=args.output, budget_usd=str(2 * len(batch["tasks"])),
        reserve_usd="2", model=args.model, timeout=args.timeout,
        allow_uncapped_session=single, allow_uncapped_batch=not single)
    try:
        report = parallel.execute(batch, request)
    except (ValueError, OSError) as exc:
        parser.error(str(exc))
    print(json.dumps(report, sort_keys=True, indent=2))
    return (0 if report["status"] in
            ("PROCESSED_ALL_WITH_ARTIFACTS", "PROCESSED_WITH_TERMINAL_FAILURES")
            else 2)


if __name__ == "__main__":
    sys.exit(main())
