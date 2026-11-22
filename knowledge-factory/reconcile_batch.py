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
                "claims", "reconciliation", "recovered", "downloaded", "__pycache__"):
            continue
        candidate = folder / (task_id + ".json")
        if candidate.is_file():
            paths.append(candidate)
    return sorted(paths)


def _valid_recovery(recovered, original, task):
    """Recovery sidecar must be source/turn exact and cite its immutable root."""
    if not _valid_receipt(recovered, task):
        return False
    if (not isinstance(original, dict)
            or recovered.get("recoveryAuthority") != "READ_ONLY_AGENTS_API"
            or recovered.get("originalReceiptPath") is None
            or recovered.get("state") != "agent-turn-reported"
            or recovered.get("turnOutcome") not in TERMINAL
            or not _known_ref(recovered.get("sessionId"))
            or not _known_ref(recovered.get("turnId"))):
        return False
    existing = original.get("sessionId")
    if _known_ref(existing) and existing != recovered["sessionId"]:
        return False
    return True


def write_recovery_sidecars(scan, output):
    """Add verified read-only terminal receipts without overwriting any source.

    A sidecar is not proof of project migration success, merely a recovered
    root-turn + artifact-hash receipt. Entire operation has zero API writes.
    """
    output = Path(output)
    recovered = []
    for row in scan.get("rows", []):
        live = row.get("live")
        if not isinstance(live, dict) or live.get("liveStatus") not in (
                "COMPLETED_WITH_ARTIFACTS", "COMPLETED_ARTIFACTS_MISSING",
                "FAILED_TERMINAL", "CANCELLED_TERMINAL"):
            continue
        paths = row.get("receiptFiles", [])
        if len(paths) != 1:
            continue
        original_path = output / paths[0]
        source = json.loads(original_path.read_bytes())
        if (not isinstance(source, dict)
                or not isinstance(source.get("task"), str)
                or not _known_ref(source.get("sessionId"))
                or source["sessionId"] != row.get("sessionId")
                or not _known_ref(live.get("turnId"))
                or live.get("turnOutcome") not in TERMINAL):
            continue
        if (_classify(source) in ("FAILED_TERMINAL", "CANCELLED_TERMINAL",
                                  "COMPLETED_WITH_ARTIFACTS")
                and source.get("turnId") == live.get("turnId")):
            continue  # Already fully recorded by original receipt.
        dest = output / "recovered" / (source["task"] + ".json")
        if dest.exists():
            continue  # No rewrite or overwrite, even if previously incomplete.
        item = dict(source)
        item.update({
            "state": "agent-turn-reported",
            "turnOutcome": live["turnOutcome"],
            "turnId": live["turnId"],
            "artifactEvidence": live.get(
                "artifactEvidence", {"status": "not-confirmed"}),
            "migrationVerdict": "UNKNOWN",
            "recoveryAuthority": "READ_ONLY_AGENTS_API",
            "originalReceiptPath": paths[0],
            "recoveredUtc": datetime.now(timezone.utc).isoformat(),
        })
        if isinstance(live.get("errorCode"), str):
            item["rootErrorCode"] = live["errorCode"]
        try:
            agent.reserve_once(dest, item)
        except FileExistsError:
            continue
        recovered.append(dest.relative_to(output).as_posix())
    return recovered


def _summary_implied_attempts(output):
    """Fail closed on orphan launched tasks known only through old summaries.

    A current RUNNING launch claim is not proof which requests reached OpenAI,
    so all its selected tasks remain reserved. A terminal summary's
    'unlaunched' list releases precisely tasks never submitted.
    """
    output = Path(output)
    blocked = set()
    if not output.exists():
        return blocked
    for folder in output.iterdir():
        if not folder.is_dir() or folder.name in (
                "claims", "reconciliation", "downloaded", "recovered", "__pycache__"):
            continue
        summaries = {}
        for file in folder.glob("parallel-summary*.json"):
            try:
                summary = json.loads(file.read_bytes())
            except (OSError, ValueError, TypeError):
                continue
            if not isinstance(summary, dict):
                continue
            offset = summary.get("offset")
            if isinstance(offset, int):
                summaries[offset] = summary
            for row in summary.get("results", []):
                if isinstance(row, dict) and isinstance(row.get("task"), str):
                    blocked.add(row["task"])
        for file in folder.glob("launch-claim-offset-*.json"):
            try:
                claim = json.loads(file.read_bytes())
            except (OSError, ValueError, TypeError):
                continue
            if (not isinstance(claim, dict) or not isinstance(claim.get("offset"), int)
                    or not isinstance(claim.get("taskIds"), list)):
                continue
            summary = summaries.get(claim["offset"])
            # Only an actually *terminal* summary with explicit unlaunched
            # identities can release tasks reserved by a launch claim.
            final = bool(summary and summary.get("status") in (
                "HALTED_UNCONFIRMED", "INTERRUPTED_RECONCILED",
                "PROCESSED_WITH_TERMINAL_FAILURES",
                "PROCESSED_ALL_WITH_ARTIFACTS"))
            unlaunched = set(summary.get("unlaunched", [])) if final else set()
            for taskid in claim["taskIds"]:
                if isinstance(taskid, str) and taskid not in unlaunched:
                    blocked.add(taskid)
    return blocked


def census(data, output, *, online=False, key=None, get=None, attest=None):
    """Build an 80-row manifest; ambiguity never becomes NOT_LAUNCHED."""
    output = Path(output)
    if online and not key:
        raise ValueError("Read-only live reconciliation requires OPENAI_API_KEY")
    # Even legacy runs without a per-task receipt can have a persisted
    # session result/launch claim in a summary. Never label those tasks fresh.
    summary_attempts = _summary_implied_attempts(output)
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
            "receiptFiles": [path.relative_to(output).as_posix() for path in paths],
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
        elif claim or ident in summary_attempts:
            entry["status"] = "UNKNOWN_CLAIMED"
            if ident in summary_attempts:
                entry["referencedByPriorSummary"] = True

        # Strictly validate a separate, immutable server-recovered sidecar.
        # It can strengthen a previous terminal checkpoint without modifying
        # the original. Conflicting/broken recovery records fail closed.
        sidecar = output / "recovered" / (ident + ".json")
        if sidecar.exists():
            try:
                recovered = json.loads(sidecar.read_bytes())
                original_path, original = evidence[0] if len(evidence) == 1 else (None, None)
                if original_path is None or not _valid_recovery(recovered, original, task):
                    raise ValueError("Recovered receipt identity mismatch")
                expected = original_path.relative_to(output).as_posix()
                if recovered["originalReceiptPath"] not in (expected, expected.replace("/", "\\")):
                    raise ValueError("Recovered receipt path mismatch")
                if entry["status"] not in ("UNKNOWN_CONFLICT",):
                    entry["status"] = _classify(recovered)
                    entry["recoveredFromSidecar"] = True
                    entry["recoveredReceipt"] = sidecar.relative_to(output).as_posix()
                    entry["turnId"] = recovered["turnId"]
            except (OSError, ValueError, TypeError, KeyError):
                entry["status"] = "UNKNOWN_CONFLICT"

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
    recovered_count = sum(bool(r.get("recoveredFromSidecar")) for r in rows)
    return {
        "schema": 1,
        "status": "RECONCILED_READ_ONLY" if not online else "RECONCILED_LIVE_READ_ONLY",
        "sourceBatch": data["batch"],
        "sourceCorpusSha256": agent.sha(agent.encode(data)),
        "totalTasks": len(data["tasks"]), "counts": counts,
        "neverLaunched": counts["NOT_LAUNCHED"],
        "recoveredReceiptCount": recovered_count,
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
    parser.add_argument("--recover-terminal", action="store_true",
                        help="Explicitly create verified terminal sidecars after read-only API GET")
    parser.add_argument("--summary-only", action="store_true")
    args = parser.parse_args(argv)
    data = agent.corpus(args.corpus)
    key = os.environ.get("OPENAI_API_KEY") if args.online else None
    try:
        result = census(data, args.output, online=args.online, key=key)
    except (ValueError, OSError) as exc:
        parser.error(type(exc).__name__)
    if args.recover_terminal:
        if not args.online:
            parser.error("--recover-terminal requires --online")
        recovered = write_recovery_sidecars(result, args.output)
        result["newRecoveredReceipts"] = recovered
        # Preserve the read-only manifest and sidecar records separately.
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
