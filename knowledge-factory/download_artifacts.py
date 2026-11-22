#!/usr/bin/env python3
"""Download only receipt-attested Agents API JSON artifacts for private review.

This is evidence transport, NOT independent migration verification.
No fresh paid sessions, token exposure, execution of agent code or Git commits.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path

import run_batch as lab

ALLOWED_PATHS = {
    "/workspace/outputs/migration-report.json": "migration-report.json",
    "/workspace/outputs/commands.json": "commands.json",
}
SHA256 = re.compile(r"[a-f0-9]{64}\Z")


def download_attested(receipt_path, key, *, output_dir=None, read=None):
    read = read or lab.api_read
    receipt_path = Path(receipt_path)
    doc = json.loads(receipt_path.read_bytes())
    if not isinstance(doc, dict) or doc.get("schema") != 1:
        raise ValueError("Invalid local receipt")
    task = doc.get("task")
    session_id, turn_id = doc.get("sessionId"), doc.get("turnId")
    proof = doc.get("artifactEvidence")
    if (not isinstance(task, str) or not lab.ID.fullmatch(task)
            or not isinstance(session_id, str)
            or not lab.SAFE_REF.fullmatch(session_id)
            or not isinstance(turn_id, str) or not lab.SAFE_REF.fullmatch(turn_id)
            or doc.get("state") != "agent-turn-reported"
            or doc.get("turnOutcome") != "completed"
            or not isinstance(proof, dict) or proof.get("status") != "complete"):
        raise ValueError("Receipt does not attest a completed root turn and artifacts")
    rows = proof.get("artifacts")
    if not isinstance(rows, list) or len(rows) != len(ALLOWED_PATHS):
        raise ValueError("Incomplete receipt artifact set")
    expected = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid receipt artifact")
        name, ident, count, digest = (
            row.get("path"), row.get("artifactId"), row.get("bytes"), row.get("sha256"))
        if (name not in ALLOWED_PATHS or name in expected
                or not isinstance(ident, str) or not lab.SAFE_REF.fullmatch(ident)
                or type(count) is not int or not 1 <= count <= 1_000_000
                or not isinstance(digest, str) or not SHA256.fullmatch(digest)):
            raise ValueError("Unsafe receipt artifact identity or bounds")
        expected[name] = {"artifactId": ident, "bytes": count, "sha256": digest}
    if set(expected) != set(ALLOWED_PATHS):
        raise ValueError("Missing expected receipt artifact")

    # Verify the immutable provider listing matches the original receipt.
    prefix = "/v1/agents/sessions/" + session_id + "/artifacts"
    listing = json.loads(read(prefix + "?limit=100", key, 100_000))
    if (not isinstance(listing, dict) or listing.get("has_more") is not False
            or not isinstance(listing.get("data"), list)):
        raise ValueError("Untrusted/incomplete artifact listing")
    provider = {}
    for row in listing["data"]:
        if not isinstance(row, dict):
            raise ValueError("Malformed provider artifact listing")
        name = row.get("path")
        if name not in expected:
            continue
        if (name in provider or row.get("session_id") != session_id
                or row.get("turn_id") != turn_id
                or row.get("id") != expected[name]["artifactId"]
                or row.get("size_bytes") != expected[name]["bytes"]):
            raise ValueError("Provider artifact metadata differs from immutable receipt")
        provider[name] = row
    if set(provider) != set(expected):
        raise ValueError("Provider listing lacks receipt-attested artifacts")

    blobs = {}
    for name in ALLOWED_PATHS:
        meta = expected[name]
        raw = read(prefix + "/" + meta["artifactId"] + "/content", key, meta["bytes"])
        if (len(raw) != meta["bytes"]
                or hashlib.sha256(raw).hexdigest() != meta["sha256"]):
            raise ValueError("Artifact size/hash differs from original receipt")
        if not isinstance(json.loads(raw), (dict, list)):
            raise ValueError("Artifact must contain JSON object or array")
        blobs[name] = raw

    target = (Path(output_dir) if output_dir is not None
              else receipt_path.parent / "downloaded" / task)
    # No overwrites. All network and SHA checks finish before creating outputs.
    target.mkdir(parents=True, exist_ok=False)
    manifest = {"schema": 1, "task": task,
                "sessionId": session_id, "turnId": turn_id,
                "sourceCommit": doc.get("commit"),
                "authority": "UNTRUSTED_AGENT_OUTPUT",
                "independentVerification": "NOT_RUN",
                "files": []}
    for name, filename in ALLOWED_PATHS.items():
        path = target / filename
        with path.open("xb") as output:
            output.write(blobs[name])
        if os.name != "nt":
            path.chmod(0o600)
        manifest["files"].append({
            "name": filename, "bytes": expected[name]["bytes"],
            "sha256": expected[name]["sha256"]})
    with (target / "review-manifest.json").open("x", encoding="utf-8") as output:
        json.dump(manifest, output, indent=2, sort_keys=True)
        output.write("\n")
    if os.name != "nt":
        (target / "review-manifest.json").chmod(0o600)
    return manifest, target


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("receipt", type=Path, help="Exact local *.json task receipt")
    parser.add_argument("--output-dir", type=Path, help="New private directory; never overwrite")
    args = parser.parse_args(argv)
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        parser.error("OPENAI_API_KEY is required in environment, never on command line")
    try:
        result, folder = download_attested(args.receipt, key, output_dir=args.output_dir)
    except (ValueError, OSError, KeyError, TypeError, json.JSONDecodeError) as exc:
        parser.error("Artifact verification failed: " + type(exc).__name__)
    print(json.dumps({"status": "DOWNLOADED_AND_HASH_CHECKED_ONLY",
                      "directory": str(folder),
                      "files": result["files"],
                      "independentVerification": "NOT_RUN"},
                     sort_keys=True, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
