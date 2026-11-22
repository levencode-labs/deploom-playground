"""Validate public SHA-locked discovery and official research sources offline.

The input is a list of research candidates, NOT migration evidence.
"""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
SHA = re.compile(r"[a-f0-9]{40}\Z")
REPO = re.compile(r"[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+\Z")
PKG = re.compile(r"(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*\Z")
LANES = frozenset({"next-react", "vite-build", "vue-nuxt", "typescript-eslint",
                   "testing", "ui-tailwind", "monorepo", "library-upstream"})
TOPICS = frozenset({"codemod", "breaking-change", "incompatibility", "playbook", "failure-mode"})
OFFICIAL = frozenset({"react.dev", "nextjs.org", "vite.dev", "vitest.dev",
                      "eslint.org", "tailwindcss.com", "www.prisma.io", "zod.dev",
                      "jestjs.io", "mui.com", "www.typescriptlang.org", "docs.nestjs.com"})


def require(value, message):
    if not value:
        raise ValueError("Invalid research catalog: " + message)


def projects(folder=ROOT / "corpus"):
    files = sorted(Path(folder).glob("discovery-*.lock.json"))
    require(len(files) == 9, "expected exactly nine pinned source groups")
    rows, seen = [], set()
    for file in files:
        doc = json.loads(file.read_bytes())
        require(isinstance(doc, dict)
                and set(doc) == {"schema", "kind", "date", "note", "projects"}
                and type(doc["schema"]) is int and doc["schema"] == 1
                and doc["kind"] == "source-exact-discovery-corpus", "file header")
        require(isinstance(doc["projects"], list) and len(doc["projects"]) <= 10, "group size")
        for item in doc["projects"]:
            require(isinstance(item, dict) and set(item) == {
                "provider", "repository", "sourceRef", "sourceCommit", "sourceTree", "lane", "status"
            }, "source fields")
            require(item["provider"] == "github" and isinstance(item["repository"], str)
                    and REPO.fullmatch(item["repository"])
                    and isinstance(item["sourceRef"], str) and 1 <= len(item["sourceRef"]) <= 32
                    and isinstance(item["sourceCommit"], str) and SHA.fullmatch(item["sourceCommit"])
                    and isinstance(item["sourceTree"], str) and SHA.fullmatch(item["sourceTree"])
                    and item["lane"] in LANES and item["status"] == "PINNED_NOT_EXECUTED",
                    "unverified commit, package or false PASS")
            require(item["repository"].lower() not in seen, "duplicate source")
            seen.add(item["repository"].lower())
            rows.append(item)
    require(len(rows) == 80, "exactly 80 source-locked research candidates")
    require(all(sum(r["lane"] == lane for r in rows) == 10 for lane in LANES),
            "balanced source groups")
    return rows


def guides(file=ROOT / "research/official-guides.json"):
    doc = json.loads(Path(file).read_bytes())
    require(isinstance(doc, dict) and set(doc) == {
        "schema", "kind", "preparedUtc", "status", "policy", "candidates"
    } and type(doc["schema"]) is int and doc["schema"] == 1
        and doc["status"] == "RESEARCH_ONLY"
        and doc["kind"] == "official-migration-research-candidates", "research-only authority")
    rows = doc["candidates"]
    require(isinstance(rows, list) and len(rows) == 12, "expected twelve official guides")
    seen = set()
    for item in rows:
        require(isinstance(item, dict) and set(item) == {
            "id", "primaryPackage", "fromMajor", "toMajor", "topics", "guide",
            "investigate", "negativeChecks"}, "guide fields")
        require(isinstance(item["id"], str) and re.fullmatch(r"[a-z0-9][a-z0-9-]{4,95}", item["id"])
                and item["id"] not in seen, "guide identity")
        seen.add(item["id"])
        require(isinstance(item["primaryPackage"], str)
                and PKG.fullmatch(item["primaryPackage"]), "npm package")
        require(all(type(item[k]) is int and 0 <= item[k] <= 999 for k in ("fromMajor", "toMajor")),
                "major range")
        require(isinstance(item["topics"], list) and 1 <= len(item["topics"]) <= 4
                and all(isinstance(t, str) and t in TOPICS for t in item["topics"]),
                "knowledge category")
        url = urlsplit(item["guide"])
        require(url.scheme == "https" and url.hostname in OFFICIAL
                and url.username is None and url.password is None
                and url.fragment == "" and url.query == "" and bool(url.path)
                and url.port is None, "untrusted documentation source")
        for k in ("investigate", "negativeChecks"):
            evidence = item[k]
            require(isinstance(evidence, list) and 1 <= len(evidence) <= 8
                    and all(isinstance(v, str) and 5 <= len(v) <= 220
                            and all(ord(c) >= 32 for c in v) for v in evidence),
                    "missing or oversized research negative control")
    return rows


def report():
    pinned = projects()
    docs = guides()
    canonical = json.dumps(pinned, sort_keys=True, separators=(",", ":")).encode()
    return {"status": "RESEARCH_ONLY", "pinnedProjects": len(pinned),
            "officialGuides": len(docs),
            "publicCorpusSha256": hashlib.sha256(canonical).hexdigest(),
            "observedMigrationPasses": 0, "verifiedKnowledgeCards": 0,
            "trueBlindHoldout": False}


if __name__ == "__main__":
    print(json.dumps(report(), indent=2, sort_keys=True))
