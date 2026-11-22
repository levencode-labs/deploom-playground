#!/usr/bin/env python3
"""Inspect or explicitly cancel an agent session from an immutable local receipt.

Never replay an agent prompt or create a new paid session. Cancellation is a
server-side control event, not killing the local dispatcher process.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError

import run_batch as api


def inspect_or_cancel(receipt_path, key, *, execute_cancel=False,
                      get=None, cancel=None):
    get = get or api.api_json
    cancel = cancel or api.cancel_active_agent_turn
    row = json.loads(Path(receipt_path).read_bytes())
    if (not isinstance(row, dict) or row.get("schema") != 1
            or not isinstance(row.get("task"), str)
            or row.get("apiSpendControlMode") != "UNLIMITED_EXPLICIT_OPT_IN"):
        raise ValueError("Only original uncapped Knowledge Factory receipts are accepted")
    ident = row.get("sessionId")
    if not isinstance(ident, str) or not api.SAFE_REF.fullmatch(ident):
        raise ValueError("Receipt does not contain a safe recoverable session ID")
    path = "/v1/agents/sessions/" + ident
    result = {"schema": 1, "task": row["task"], "sessionId": ident,
              "receiptState": row.get("state"), "sessionStatus": "UNKNOWN",
              "rootTurnStatus": "UNKNOWN", "status": "UNKNOWN",
              "cancelRequested": False}
    try:
        session = get("GET", path, key)
        if session.get("id") != ident:
            raise ValueError("Session response ID does not match immutable receipt")
        result["sessionStatus"] = session.get("status", "UNKNOWN")
    except (HTTPError, URLError, OSError, ValueError, TimeoutError) as exc:
        result["sessionReadError"] = api.safe_transport_diagnostics(exc)
    try:
        turns = get("GET", path + "/turns?limit=100&order=desc", key)
        if not isinstance(turns.get("data"), list):
            raise ValueError("Invalid session turn list")
        roots = [turn for turn in turns["data"] if isinstance(turn, dict)
                 and turn.get("subagent_id") is None]
        if roots:
            root = roots[0]
            result["rootTurnStatus"] = root.get("status", "UNKNOWN")
            rid = root.get("id")
            if isinstance(rid, str) and api.SAFE_REF.fullmatch(rid):
                result["turnId"] = rid
    except (HTTPError, URLError, OSError, ValueError, TimeoutError) as exc:
        result["turnReadError"] = api.safe_transport_diagnostics(exc)

    if result["rootTurnStatus"] in ("completed", "failed", "cancelled"):
        result["status"] = "ALREADY_TERMINAL"
        return result
    if (result["sessionStatus"] == "idle" and result["rootTurnStatus"] == "UNKNOWN"
            and "turnReadError" not in result and "sessionReadError" not in result):
        result["status"] = "NO_OBSERVED_ACTIVE_TURN"
        return result
    if not execute_cancel:
        result["status"] = "READ_ONLY_ACTIVE_OR_UNCERTAIN"
        return result
    result["cancelRequested"] = True
    result.update(cancel(ident, key))
    result["status"] = ("TERMINAL_CONFIRMED"
                        if result.get("turnTerminalAfterCancelObserved")
                        else "CANCELLATION_UNCONFIRMED")
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("receipt", type=Path, help="Exact original task receipt JSON")
    parser.add_argument("--cancel", action="store_true",
                        help="Explicitly ask OpenAI to stop an active turn; records sidecar")
    args = parser.parse_args(argv)
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        parser.error("OPENAI_API_KEY required locally; never paste it in chat/logs")
    try:
        outcome = inspect_or_cancel(args.receipt, key, execute_cancel=args.cancel)
    except (ValueError, OSError, KeyError) as exc:
        parser.error("Unsafe or inaccessible receipt: " + type(exc).__name__)
    if args.cancel:
        # Append-only receipts: no original receipt or prior recovery is overwritten.
        path = args.receipt.with_name(
            args.receipt.stem + ".cancel-recovery-" + str(time.time_ns()) + ".json")
        api.reserve_once(path, outcome)
    print(json.dumps(outcome, sort_keys=True, indent=2))
    return 0 if outcome["status"] in (
        "ALREADY_TERMINAL", "TERMINAL_CONFIRMED", "NO_OBSERVED_ACTIVE_TURN"
    ) else 2


if __name__ == "__main__":
    sys.exit(main())
