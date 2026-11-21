"""Build a hosted browser snapshot from the complete OSV npm ecosystem export."""

import argparse
import gzip
from io import TextIOWrapper
from datetime import datetime
from email.utils import parsedate_to_datetime
import json
from pathlib import Path
import shutil
from tempfile import NamedTemporaryFile, TemporaryFile
from urllib.request import urlopen
from zipfile import ZipFile


SOURCE = "https://osv-vulnerabilities.storage.googleapis.com/npm/all.zip"
LIFETIME = 7 * 24 * 60 * 60


def build_index(archive_file, published):
    packages = {}
    advisories = {}
    rows = 0
    with ZipFile(archive_file) as archive:
        for member in sorted(archive.infolist(), key=lambda item: item.filename):
            if member.is_dir():
                continue
            if not member.filename.endswith(".json"):
                raise ValueError(f"Unexpected entry in OSV export: {member.filename}")
            record = json.loads(archive.read(member))
            if record.get("withdrawn"):
                continue
            identifier = record["id"]
            count = 0
            for affected in record["affected"]:
                package = affected.get("package")
                if not package and affected.get("ranges") and all(r["type"] == "GIT" for r in affected["ranges"]):
                    continue
                if package["ecosystem"] != "npm":
                    continue
                name = package["name"]
                entry = {
                    "id": identifier,
                    "severity": (record.get("database_specific") or {}).get("severity"),
                    "ranges": [{"type": r["type"], "events": r["events"]} for r in affected.get("ranges", [])],
                    "versions": affected.get("versions", []),
                }
                packages.setdefault(name, []).append(entry)
                count += 1
            if count:
                if identifier in advisories:
                    raise ValueError(f"Duplicate OSV record: {identifier}")
                advisories[identifier] = {
                    key: record[key] for key in ("summary", "published", "modified", "aliases") if record.get(key)
                }
                rows += count
    if not rows:
        raise ValueError("No affected npm packages in archive")
    return {
        "schema": 1, "source": "OSV", "ecosystem": "npm", "coverage": "npm-ecosystem",
        "published": published, "expires": published + LIFETIME, "rows": rows,
        "packages": packages, "advisories": advisories,
    }


def publish(archive_file, published, output):
    snapshot = build_index(archive_file, published)
    output.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(dir=output.parent, delete=False) as temporary:
        staged = Path(temporary.name)
    try:
        with staged.open("wb") as raw:
            buffer = gzip.GzipFile(filename="", mode="wb", fileobj=raw, compresslevel=6, mtime=0) if output.suffix == ".gz" else raw
            with TextIOWrapper(buffer, encoding="utf-8", newline="\n") as stream:
                # ASCII JSON avoids widening the entire source string while browsers parse this large catalog.
                json.dump(snapshot, stream, separators=(",", ":"), sort_keys=True)
                stream.write("\n")
        staged.chmod(0o644)
        staged.replace(output)
    finally:
        staged.unlink(missing_ok=True)
    print(f"{snapshot['rows']} affected package records, {len(snapshot['advisories'])} advisories; {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    parser.add_argument("--archive", type=Path, help="a complete saved npm/all.zip")
    parser.add_argument("--published", help="upstream Last-Modified in ISO-8601 format with UTC offset")
    args = parser.parse_args()
    if bool(args.archive) != bool(args.published):
        parser.error("--archive and --published must appear together")
    if args.archive:
        date = datetime.fromisoformat(args.published.replace("Z", "+00:00"))
        if date.tzinfo is None:
            parser.error("--published must include a timezone")
        publish(args.archive, int(date.timestamp()), args.output)
        return
    with urlopen(SOURCE, timeout=120) as response, TemporaryFile() as archive:
        date = parsedate_to_datetime(response.headers["Last-Modified"])
        shutil.copyfileobj(response, archive)
        archive.seek(0)
        publish(archive, int(date.timestamp()), args.output)


if __name__ == "__main__":
    main()
