#!/usr/bin/env python3
"""Create offline, source-pinned Agents research batches without claiming PASS.

A real blind holdout requires an access-controlled seed and PRIVATE output:
never publish a training manifest revealing the complementary held-out names.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import re
from pathlib import Path

from validate_catalog import ROOT, guides, projects

GUIDES_BY_LANE = {
    "next-react": ("react-19-removed-apis", "next-16-codemods"),
    "vite-build": ("vite-8-rolldown", "vitest-5-runner"),
    "vue-nuxt": ("vite-8-rolldown", "tailwind-4-css-config"),
    "typescript-eslint": ("eslint-9-flat-config", "typescript-6-config"),
    "testing": ("vitest-5-runner", "jest-30-matcher"),
    "ui-tailwind": ("tailwind-4-css-config", "mui-7-exports"),
    "monorepo": ("typescript-6-config", "prisma-7-client"),
    "library-upstream": ("react-19-removed-apis", "vite-8-rolldown"),
}
OUTPUT_NOTICE = (
    "This is a candidate investigation, not an approved dependency update. "
    "Verify the actual pinned package versions, source usages, peer and runtime constraints. "
    "If the upgrade does not apply, return NOT_APPLICABLE with evidence. "
    "Never weaken tests, push changes, publish results or call an unapproved registry."
)


def split_corpus(rows, secret=None, holdout_count=16):
    """Withhold exact identities using a private >=32-byte secret; never publish it."""
    if secret is None:
        return rows[:], []
    if not isinstance(secret, str) or len(secret.encode()) < 32:
        raise ValueError("Blind holdout requires a 32+ byte secret stored outside Git")
    if not 1 <= holdout_count <= len(rows) // 3:
        raise ValueError("Invalid holdout size")
    ranked = sorted(rows, key=lambda r: hmac.new(
        secret.encode(), (r["repository"] + "\0" + r["sourceCommit"]).encode(),
        hashlib.sha256).digest())
    withheld = ranked[:holdout_count]
    withheld_ids = {row["repository"] for row in withheld}
    training = [row for row in rows if row["repository"] not in withheld_ids]
    return training, withheld


def generate_batches(training):
    references = {item["id"]: item for item in guides()}
    batches = {}
    for lane in sorted(GUIDES_BY_LANE):
        selected = sorted((item for item in training if item["lane"] == lane),
                          key=lambda r: r["repository"].lower())
        if not selected:
            continue
        guide_urls = [references[k]["guide"] for k in GUIDES_BY_LANE[lane]]
        goal = ("Investigate the pinned checkout for source-backed breaking changes, "
                "codemod guidance and incompatibilities from these official guides: "
                + " ; ".join(guide_urls) + ". " + OUTPUT_NOTICE)
        if len(goal) > 500:
            raise ValueError("Research goal exceeds bounded agent task field")
        tasks = []
        for row in selected:
            slug = re.sub(r"[^a-z0-9]+", "-", row["repository"].lower()).strip("-")[:52]
            tasks.append({"id": slug + "-" + row["sourceCommit"][:8],
                          "provider": "github", "repository": row["repository"],
                          "sha": row["sourceCommit"], "goal": goal})
        batches[lane] = {"schema": 1, "batch": "research-" + lane + "-001", "tasks": tasks}
    return batches


def manifest(training, withheld):
    ordered = sorted(training, key=lambda r: r["repository"].lower())
    raw = json.dumps(ordered, sort_keys=True, separators=(",", ":")).encode()
    return {"schema": 1, "status": "NOT_EXECUTED", "trainingCount": len(training),
            "withheldCount": len(withheld), "trainingDigestSha256": hashlib.sha256(raw).hexdigest(),
            "sourceIdentityIsVerified": True, "migrationVerification": "NOT_RUN",
            "holdoutWasBlinded": bool(withheld),
            "reason": "Corpus/source SHA alone does not prove an actual migration"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--private-holdout", type=Path, help="Private, access-controlled file; NEVER CI artifact")
    parser.add_argument("--holdout-count", type=int, default=16)
    args = parser.parse_args()
    all_rows = projects()
    secret = os.environ.get("DEPLOOM_HOLDOUT_SECRET")
    if bool(secret) != bool(args.private_holdout):
        parser.error("A protected holdout secret and explicit private output are both required")
    if secret:
        for target in (args.output_dir, args.private_holdout):
            if target.resolve().is_relative_to(ROOT.parents[0].resolve()):
                parser.error("Blind split outputs must never be saved in the public repository")
    training, withheld = split_corpus(all_rows, secret, args.holdout_count)
    batchfiles = generate_batches(training)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for lane, batch in batchfiles.items():
        target = args.output_dir / ("research-" + lane + ".json")
        with target.open("x", encoding="utf-8") as stream:
            stream.write(json.dumps(batch, sort_keys=True, indent=2) + "\n")
    if withheld:
        # The actual withheld identities are NEVER printed or uploaded by this command.
        out = args.private_holdout
        out.parent.mkdir(parents=True, exist_ok=True)
        with out.open("x", encoding="utf-8") as stream:
            os.chmod(out, 0o600)
            json.dump({"schema": 1, "status": "PRIVATE_BLIND_HOLDOUT",
                       "projects": withheld}, stream, sort_keys=True, indent=2)
            stream.write("\n")
    print(json.dumps(manifest(training, withheld), sort_keys=True))


if __name__ == "__main__":
    main()
