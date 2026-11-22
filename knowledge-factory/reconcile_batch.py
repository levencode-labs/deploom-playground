#!/usr/bin/env python3
"""Read-only source-exact reconciliation of every Knowledge Factory task.

This tool never creates a paid agent, modifies a historical receipt, deletes
data, or assumes that a missing local summary means an absent cloud session.
For a live verdict pass --online with OPENAI_API_KEY in the environment; it
uses GET requests only. Unknown and conflicting attempts stay non-retryable.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError

import run_batch as agent

CLASSIFICATIONS = (
    "COMPLETED_WITH_ARTIFACTS",
    "COMPLETED_ARTIFACTS_MISSING",
    "FAILED_TERMINAL",
    "CANCELLED_TERMINAL",
    "UNKNOWN_ACTIVE",
    "UNKNOWN_DISCONNECTED",
    "UNKNOWN_CONFLICT",
    "UNKNOWN_CLAIMED",
    "NOT_LAUNCHED",
)
TERMINAL = {"completed", "failed", "cancelled"}


def _valid_receipt(row, task):
    return (isinstance(row, dict) and row.get("schema") == 1
            and row.get("task") == task["id"]
            and row.get("commit") == task["sha"]
            and row.get("promptSha256") == agent.sha(agent.prompt(task).encode())
            and isinstance(row.get("model"), str))


def _known_ref(value):
    return isinstance(value, str) and bool(agent.SAFE_REF.fullmatch(value))


def _classify(row):
    if row.get("state") == "agent-turn-reported":
        outcome = row.get("turnOutcome")
        if (outcome in TERMINAL and _known_ref(row.get("sessionId"))
                and _known_ref(row.get("turnId"))):
            if outcome == "failed":
                return "FAILED_TERMINAL"
            if outcome == "cancelled":
                return "CANCELLED_TERMINAL"
            if row.get("artifactEvidence", {}).get("status") == "complete":
                return "COMPLETED_WITH_ARTIFACTS"
            return "COMPLETED_ARTIFACTS_MISSING"
    if _known_ref(row.get("sessionId")):
        return "UNKNOWN_ACTIVE"
    return "UNKNOWN_DISCONNECTED"


def _live_evidence(row, key, *, get=None, attest=None):
    """Only authenticated GET calls. Never submit input or cancel a session."""
    get = get or agent.api_json
    attest = attest or agent.artifact_receipts
    sid = row.get("sessionId")
    if not _known_ref(sid):
        return None
    path = "/v1/agents/sessions/" + sid
    observed = {"liveChecked": True, "liveStatus": "UNKNOWN"}
    try:
        session = get("GET", path, key)
        if not isinstance(session, dict) or session.get("id") != sid:
            raise ValueError("Session identity mismatch")
        observed["sessionStatus"] = session.get("status", "UNKNOWN")
        turns = get("GET", path + "/turns?limit=100&order=desc", key)
        if (not isinstance(turns, dict) or not isinstance(turns.get("data"), list)
                or turns.get("has_more") is True):
            raise ValueError("Incomplete root turn listing")
        roots = [t for t in turns["data"] if isinstance(t, dict)
                 and t.get("subagent_id") is None]
        if not roots:
            observed["liveStatus"] = "NO_OBSERVED_ROOT_TURN"
            return observed
        root = roots[0]
        status, tid = root.get("status"), root.get("id")
        if status not in TERMINAL or not _known_ref(tid):
            observed["liveStatus"] = "ACTIVE_OR_UNCERTAIN"
            return observed
        observed["turnId"] = tid
        observed["turnOutcome"] = status
        if status in ("failed", "cancelled"):
            observed["liveStatus"] = status.upper() + "_TERMINAL"
            code = root.get("error", {})
            if isinstance(code, dict) and isinstance(code.get("code"), str):
                safe = code["code"]
                if len(safe) <= 80 and all(c.isalnum() or c in "_-" for c in safe):
                    observed["errorCode"] = safe
            return observed
        proof = attest(sid, tid, key)
        if proof.get("status") == "complete":
            observed["liveStatus"] = "COMPLETED_WITH_ARTIFACTS"
            observed["artifactEvidence"] = proof
        else:
            observed["liveStatus"] = "COMPLETED_ARTIFACTS_MISSING"
        return observed
    except (HTTPError, URLError, OSError, ValueError, TimeoutError,
            KeyError, TypeError, json.JSONDecodeError) as exc:
        observed["readError"] = agent.safe_transport_diagnostics(exc)
        return observed


def _classify_live(local_class, live):
    if not isinstance(live, dict):
        return local_class
    state = live.get("liveStatus")
    if state == "FAILED_TERMINAL":
        return "FAILED_TERMINAL"
    if state == "CANCELLED_TERMINAL":
        return "CANCELLED_TERMINAL"
    if state in ("COMPLETED_WITH_ARTIFACTS", "COMPLETED_ARTIFACTS_MISSING"):
        return state
    # A previous terminal local receipt is never downgraded because a
    # later read fails or is incomplete.
    return local_class


def _candidate_paths(root, task_id):
    """Only immediate task JSON files in a batch directory are evidence."""
    if not root.exists():
        return []
    paths = []
    for folder in root.iterdir():
        if not folder.is_dir() or folder.name in (
                "claims", "reconciliation", "downloaded", "__pycache__"):
            continue
        candidate = folder / (task_id + ".json")
        if candidate.is_file():
            paths.append(candidate)
    return sorted(paths)


def census(data, output, *, online=False, key=None, get=None, attest=None):
    """Build an 80-row manifest; ambiguity never becomes NOT_LAUNCHED."""
    output = Path(output)
    if online and not key:
        raise ValueError("Read-only live reconciliation requires OPENAI_API_KEY")
    rows = []
    for task in data["tasks"]:
        ident = task["id"]
        paths = _candidate_paths(output, ident)
        claim_path = output / "claims" / (ident + ".json")
        claim = claim_path.is_file()
        evidence = []
        for path in paths:
            try:
                item = json.loads(path.read_bytes())
            except (OSError, ValueError, TypeError):
                item = None
            evidence.append((path, item))
        entry = {
            "task": ident, "sourceCommit": task["sha"],
            "receiptFiles": [str(path.relative_to(output)) for path in paths],
            "hasGlobalClaim": claim, "status": "NOT_LAUNCHED",
        }
        if len(evidence) > 1:
            entry["status"] = "UNKNOWN_CONFLICT"
        elif len(evidence) == 1:
            doc = evidence[0][1]
            if not _valid_receipt(doc, task):
                entry["status"] = "UNKNOWN_CONFLICT"
            else:
                entry["status"] = _classify(doc)
                entry["model"] = doc.get("model")
                if _known_ref(doc.get("sessionId")):
                    entry["sessionId"] = doc["sessionId"]
                if _known_ref(doc.get("turnId")):
                    entry["turnId"] = doc["turnId"]
                if doc.get("failurePhase") and isinstance(doc["failurePhase"], str):
                    entry["failurePhase"] = doc["failurePhase"][:80]
                for field in ("apiErrorCode", "errorKind", "turnOutcome"):
                    value = doc.get(field)
                    if isinstance(value, str) and len(value) <= 80:
                        entry[field] = value
                if online and _known_ref(doc.get("sessionId")):
                    live = _live_evidence(doc, key, get=get, attest=attest)
                    entry["status"] = _classify_live(entry["status"], live)
                    entry["live"] = live
                    if live.get("turnId"):
                        entry["turnId"] = live["turnId"]
        elif claim:
            entry["status"] = "UNKNOWN_CLAIMED"

        # Legacy old attempts have receipts without global claims; both
        # old and new attempts block paid replay. A claim with malformed
        # content is also conservatively ambiguous.
        if claim:
            try:
                claimed = json.loads(claim_path.read_bytes())
                if (not isinstance(claimed, dict) or claimed.get("task") != ident
                        or claimed.get("commit") != task["sha"]):
                    entry["status"] = "UNKNOWN_CONFLICT"
            except (OSError, ValueError, TypeError):
                entry["status"] = "UNKNOWN_CONFLICT"
        rows.append(entry)
    counts = {name: sum(r["status"] == name for r in rows)
              for name in CLASSIFICATIONS}
    return {
        "schema": 1,
        "status": "RECONCILED_READ_ONLY" if not online else "RECONCILED_LIVE_READ_ONLY",
        "sourceBatch": data["batch"],
        "sourceCorpusSha256": agent.sha(agent.encode(data)),
        "totalTasks": len(data["tasks"]), "counts": counts,
        "neverLaunched": counts["NOT_LAUNCHED"],
        "migrationVerification": "NOT_RUN",
        "rows": rows,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=agent.ROOT / ".runs")
    parser.add_argument("--online", action="store_true",
                        help="Read-only GET status and hash-check artifacts")
    parser.add_argument("--write", action="store_true",
                        help="Save a new immutable reconciliation snapshot")
    parser.add_argument("--summary-only", action="store_true")
    args = parser.parse_args(argv)
    data = agent.corpus(args.corpus)
    key = os.environ.get("OPENAI_API_KEY") if args.online else None
    try:
        result = census(data, args.output, online=args.online, key=key)
    except (ValueError, OSError) as exc:
        parser.error(type(exc).__name__)
    if args.write:
        path = args.output / "reconciliation" / (
            "reconcile-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
            + ".json")
        agent.reserve_once(path, result)
        result["savedTo"] = str(path)
    if args.summary_only:
        result = {k: v for k, v in result.items() if k != "rows"}
    print(json.dumps(result, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
