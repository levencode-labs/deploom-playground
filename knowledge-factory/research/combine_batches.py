#!/usr/bin/env python3
"""Build one balanced source-exact research queue across eight dependency lanes.

Source identity comes exclusively from the pinned public repository corpus.
No API calls, private holdout labels, or migration verdicts are involved.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from prepare_batches import generate_batches
from validate_catalog import projects


def combined(pinned=None):
    sources = projects() if pinned is None else pinned
    lanes = generate_batches(sources)
    ordered = []
    seen = set()
    for index in range(max(map(lambda x: len(x["tasks"]), lanes.values()))):
        for lane in sorted(lanes):
            items = lanes[lane]["tasks"]
            if index >= len(items):
                continue
            task = items[index]
            if task["id"] in seen:
                raise ValueError("Duplicate source-exact task across lanes")
            seen.add(task["id"])
            ordered.append(task)
    if len(ordered) != len(sources):
        raise ValueError("Balanced queue lost pinned source identities")
    return {"schema": 1, "batch": "research-balanced-001", "tasks": ordered}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    payload = combined()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("x", encoding="utf-8") as file:
        json.dump(payload, file, indent=2, sort_keys=True)
        file.write("\n")
    print(json.dumps({"status": "NOT_EXECUTED", "sourceExactTasks": len(payload["tasks"]),
                      "firstWave": [t["id"] for t in payload["tasks"][:8]]}))


if __name__ == "__main__":
    main()
