import io
import json
import tempfile
from pathlib import Path
import sys
import unittest
from zipfile import BadZipFile, ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "tools"))
from build_hosted_osv import build_index, publish


class HostedOsvBuildTest(unittest.TestCase):
    def test_single_metadata_record_for_multiple_package_ranges(self):
        raw = io.BytesIO()
        with ZipFile(raw, "w") as archive:
            affected = [{
                "package": {"ecosystem": "npm", "name": name},
                "ranges": [{"type": "SEMVER", "events": [{"introduced": "0"}, {"fixed": "2.0.0"}]}],
            } for name in ("one", "two")]
            live = {"id": "A", "affected": affected, "published": "2026-01-02T03:04:05Z",
                    "modified": "2026-08-01T00:00:00Z", "summary": "Example", "aliases": ["CVE-example"],
                    "database_specific": {"severity": "HIGH"}}
            archive.writestr("A.json", json.dumps(live))
            archive.writestr("B.json", json.dumps({"id": "B", "affected": affected[:1]}))
            archive.writestr("C.json", json.dumps({**live, "id": "C", "withdrawn": live["modified"]}))
        index = build_index(raw, 1_795_230_000)
        self.assertEqual(index["published"], 1_795_230_000)
        self.assertEqual(index["expires"] - index["published"], 604800)
        self.assertEqual(index["rows"], 3)
        self.assertEqual(index["advisories"], {
            "A": {key: live[key] for key in ("summary", "published", "modified", "aliases")}, "B": {},
        })
        self.assertEqual(index["packages"]["two"][0]["id"], "A")
        self.assertEqual(index["packages"]["two"][0]["ranges"], affected[1]["ranges"])
        self.assertEqual(index["packages"]["two"][0]["severity"], "HIGH")
        self.assertEqual(build_index(raw, index["published"]), index)


    def test_incomplete_archive_never_replaces_last_good_index(self):
        broken = io.BytesIO()
        with ZipFile(broken, "w") as archive:
            archive.writestr("invalid.json", b'{"affected":')
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory, "osv-npm-v1.json.gz")
            target.write_bytes(b"previous snapshot")
            with self.assertRaises(json.JSONDecodeError):
                publish(broken, 1_795_230_000, target)
            with self.assertRaises(BadZipFile):
                publish(io.BytesIO(broken.getvalue()[:-30]), 1_795_230_000, target)
            self.assertEqual(target.read_bytes(), b"previous snapshot")


if __name__ == "__main__":
    unittest.main()
