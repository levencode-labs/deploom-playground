"""Offline checks for immutable artifact provenance and safe local export."""
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import download_artifacts as export


class ArtifactExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.receipt = self.root / "task-verified.json"
        self.task = "source-task-001"
        self.session = "sess_receipt_001"
        self.turn = "turn_receipt_001"
        self.data = {
            "/workspace/outputs/migration-report.json":
                (b'{"result":"UNKNOWN","source":"public"}', "art_report_001"),
            "/workspace/outputs/commands.json":
                (b'[{"command":"npm test","exitCode":1}]', "art_commands_001"),
        }
        self.document = {
            "schema": 1, "task": self.task, "commit": "a" * 40,
            "state": "agent-turn-reported", "turnOutcome": "completed",
            "sessionId": self.session, "turnId": self.turn,
            "artifactEvidence": {"status": "complete", "artifacts": [
                {"path": path, "artifactId": identity, "bytes": len(raw),
                 "sha256": hashlib.sha256(raw).hexdigest()}
                for path, (raw, identity) in self.data.items()]}}
        self._save()

    def _save(self):
        self.receipt.write_text(json.dumps(self.document), encoding="utf-8")

    def provider(self, path, key, limit):
        self.assertEqual("local-secret", key)
        if path.endswith("?limit=100"):
            return json.dumps({"has_more": False, "data": [
                {"id": identity, "path": name, "session_id": self.session,
                 "turn_id": self.turn, "size_bytes": len(raw)}
                for name, (raw, identity) in self.data.items()]}).encode()
        for raw, identity in self.data.values():
            if path.endswith("/" + identity + "/content"):
                self.assertGreaterEqual(limit, len(raw))
                return raw
        self.fail("Unexpected provider path")

    def test_exact_bytes_exported_only_after_matching_attestation(self):
        output, folder = export.download_attested(
            self.receipt, "local-secret", read=self.provider)
        self.assertEqual("NOT_RUN", output["independentVerification"])
        self.assertEqual("UNTRUSTED_AGENT_OUTPUT", output["authority"])
        self.assertEqual(self.root / "downloaded" / self.task, folder)
        self.assertEqual(
            json.loads((folder / "migration-report.json").read_bytes()),
            {"result": "UNKNOWN", "source": "public"})
        self.assertEqual(
            json.loads((folder / "commands.json").read_bytes()),
            [{"command": "npm test", "exitCode": 1}])
        self.assertTrue((folder / "review-manifest.json").exists())
        self.assertNotIn("local-secret", (folder / "review-manifest.json").read_text())
        with self.assertRaises(FileExistsError):
            export.download_attested(self.receipt, "local-secret", read=self.provider)

    def test_mismatched_body_never_creates_review_directory(self):
        def tampered(path, key, limit):
            raw = self.provider(path, key, limit)
            if path.endswith("/art_report_001/content"):
                return b'{"result":"PASS"}'
            return raw
        with self.assertRaisesRegex(ValueError, "size/hash"):
            export.download_attested(self.receipt, "local-secret", read=tampered)
        self.assertFalse((self.root / "downloaded" / self.task).exists())

    def test_receipt_with_missing_or_duplicate_artifact_is_rejected(self):
        self.document["artifactEvidence"]["artifacts"].pop()
        self._save()
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            export.download_attested(self.receipt, "local-secret", read=self.provider)
        self.document["artifactEvidence"]["artifacts"].append(
            self.document["artifactEvidence"]["artifacts"][0].copy())
        self._save()
        with self.assertRaisesRegex(ValueError, "Unsafe"):
            export.download_attested(self.receipt, "local-secret", read=self.provider)

    def test_incomplete_provider_page_and_identity_change_rejected(self):
        def incomplete(path, key, limit):
            raw = self.provider(path, key, limit)
            if path.endswith("?limit=100"):
                payload = json.loads(raw)
                payload["has_more"] = True
                return json.dumps(payload).encode()
            return raw
        with self.assertRaisesRegex(ValueError, "incomplete"):
            export.download_attested(self.receipt, "local-secret", read=incomplete)

        def wrong_owner(path, key, limit):
            raw = self.provider(path, key, limit)
            if path.endswith("?limit=100"):
                payload = json.loads(raw)
                payload["data"][0]["session_id"] = "sess_other"
                return json.dumps(payload).encode()
            return raw
        with self.assertRaisesRegex(ValueError, "differs"):
            export.download_attested(self.receipt, "local-secret", read=wrong_owner)

    def test_untrusted_task_identity_is_rejected_without_network(self):
        self.document["task"] = "../../escape"
        self._save()
        def prohibited(*_args):
            self.fail("No API request expected")
        with self.assertRaisesRegex(ValueError, "Receipt"):
            export.download_attested(self.receipt, "local-secret", read=prohibited)


if __name__ == "__main__":
    unittest.main()
