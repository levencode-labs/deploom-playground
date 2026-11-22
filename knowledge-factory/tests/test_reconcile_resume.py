"""Offline test fixtures for complete-corpus reconciliation and resume."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "research"))
import run_batch as agent
import reconcile_batch as rec
import resume_batch as resume


class ReconcileResumeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)
        self.data = resume.combine_batches.combined()
        self.assertEqual(80, len(self.data["tasks"]))
        self.tasks = self.data["tasks"]

    def receipt(self, index, *, batch=None, outcome="completed", artifacts=True,
                state="agent-turn-reported", session_id=None, turn_id=None):
        task = self.tasks[index]
        batch = batch or "research-balanced-001"
        directory = self.output / batch
        directory.mkdir(parents=True, exist_ok=True)
        doc = {"schema": 1, "batch": batch, "task": task["id"],
               "commit": task["sha"], "promptSha256": agent.sha(
                   agent.prompt(task).encode()),
               "model": "gpt-6-luna", "state": state,
               "sessionId": session_id or "sess_receipt_" + str(index),
               "turnId": turn_id or "turn_receipt_" + str(index),
               "turnOutcome": outcome,
               "artifactEvidence": {"status": "complete" if artifacts else "missing",
                                    "artifacts": []}}
        path = directory / (task["id"] + ".json")
        path.write_text(json.dumps(doc))
        return path

    def test_full_80_offline_and_disjoint_resume_deterministic(self):
        one, scan = resume.eligible_queue(
            self.data, output=self.output, max_sessions=80, model="gpt-6-luna")
        self.assertEqual(80, scan["counts"]["NOT_LAUNCHED"])
        self.assertEqual(80, len(one["tasks"]))
        self.assertEqual(one["tasks"], self.tasks)
        self.assertEqual(one["batch"], resume.eligible_queue(
            self.data, output=self.output)[0]["batch"])
        self.assertTrue(one["batch"].startswith("research-resume-"))

        self.receipt(0)
        self.receipt(1, outcome="failed")
        self.receipt(2, outcome="cancelled")
        self.receipt(3, state="unknown-api-outcome", session_id=None)
        second, scan = resume.eligible_queue(
            self.data, output=self.output, max_sessions=80)
        self.assertEqual(76, len(second["tasks"]))
        self.assertEqual([t["id"] for t in self.tasks[4:]], [
            t["id"] for t in second["tasks"]])
        self.assertEqual(1, scan["counts"]["COMPLETED_WITH_ARTIFACTS"])
        self.assertEqual(1, scan["counts"]["FAILED_TERMINAL"])
        self.assertEqual(1, scan["counts"]["CANCELLED_TERMINAL"])
        self.assertEqual(1, scan["counts"]["UNKNOWN_ACTIVE"])
        self.assertEqual("RESUME_DRY_RUN_ZERO_CREDITS",
                         resume.plan_output(second, scan,
                                            model="gpt-6-luna",
                                            workers=2, timeout=1800)["status"])

    def test_partial_completed_receipt_is_recovered_by_live_get_without_replaying(self):
        old = self.receipt(0, state="turn-terminal", artifacts=False)
        row = json.loads(old.read_bytes())
        row.pop("turnId")
        row.pop("turnOutcome")
        old.write_text(json.dumps(row))
        scans = []
        def fake_get(method, path, key):
            scans.append((method, path))
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_live_001",
                                  "subagent_id": None, "status": "completed"}],
                        "has_more": False}
            return {"id": "sess_receipt_0", "status": "idle"}
        attest = Mock(return_value={
            "status": "complete", "artifacts": [
                {"path": "/workspace/outputs/migration-report.json",
                 "sha256": "a" * 64},
                {"path": "/workspace/outputs/commands.json",
                 "sha256": "b" * 64}]})
        manifest = rec.census(self.data, self.output, online=True,
                              key="synthetic", get=fake_get, attest=attest)
        self.assertEqual("COMPLETED_WITH_ARTIFACTS",
                         manifest["rows"][0]["status"])
        self.assertEqual("turn_live_001", manifest["rows"][0]["turnId"])
        self.assertEqual(2, len(scans))
        self.assertEqual(1, attest.call_count)
        self.assertEqual("turn-terminal", json.loads(old.read_bytes())["state"])

    def test_recovered_terminal_sidecar_preserves_original_and_enables_export(self):
        original = self.receipt(0, state="turn-terminal", artifacts=False)
        old = json.loads(original.read_bytes())
        old.pop("turnId")
        old.pop("turnOutcome")
        original.write_text(json.dumps(old))
        exact_bytes = {
            "/workspace/outputs/migration-report.json": (b'{"result":"UNKNOWN"}', "art_a_001"),
            "/workspace/outputs/commands.json": (b'[{"command":"npm test","exitCode":1}]', "art_b_001"),
        }
        import hashlib
        def fake_get(method, path, key):
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_recovered_001",
                                  "subagent_id": None, "status": "completed"}],
                        "has_more": False}
            return {"id": "sess_receipt_0", "status": "idle"}
        def read(path, key, limit):
            if path.endswith("?limit=100"):
                return json.dumps({"has_more": False, "data": [
                    {"id": ident, "path": name, "session_id": "sess_receipt_0",
                     "turn_id": "turn_recovered_001", "size_bytes": len(data)}
                    for name, (data, ident) in exact_bytes.items()]}).encode()
            for data, ident in exact_bytes.values():
                if path.endswith("/" + ident + "/content"):
                    return data
            self.fail("unexpected source-exact read")
        def attest(session, turn, key):
            return agent.artifact_receipts(session, turn, key, get=read)
        snapshot = rec.census(self.data, self.output, online=True,
                              key="synthetic", get=fake_get, attest=attest)
        self.assertEqual("COMPLETED_WITH_ARTIFACTS", snapshot["rows"][0]["status"])
        created = rec.write_recovery_sidecars(snapshot, self.output)
        self.assertEqual(["recovered/" + self.tasks[0]["id"] + ".json"], created)
        recovered = self.output / created[0]
        patched = json.loads(recovered.read_bytes())
        self.assertEqual("completed", patched["turnOutcome"])
        self.assertEqual("turn_recovered_001", patched["turnId"])
        self.assertEqual("complete", patched["artifactEvidence"]["status"])
        self.assertEqual("READ_ONLY_AGENTS_API", patched["recoveryAuthority"])
        self.assertEqual(old, json.loads(original.read_bytes()))
        again = rec.census(self.data, self.output)
        self.assertEqual("COMPLETED_WITH_ARTIFACTS", again["rows"][0]["status"])
        self.assertEqual(1, again["recoveredReceiptCount"])
        self.assertEqual([], rec.write_recovery_sidecars(snapshot, self.output))
        import download_artifacts as export
        manifest, exported_dir = export.download_attested(
            recovered, "synthetic", output_dir=self.output / "safe-export",
            read=read)
        self.assertEqual("NOT_RUN", manifest["independentVerification"])
        self.assertTrue((exported_dir / "migration-report.json").exists())

    def test_forged_recovered_receipt_fails_closed(self):
        original = self.receipt(0, state="turn-terminal", artifacts=False)
        rec_path = self.output / "recovered" / (self.tasks[0]["id"] + ".json")
        rec_path.parent.mkdir(parents=True)
        fake = json.loads(original.read_bytes())
        fake.update({"state": "agent-turn-reported", "turnOutcome": "completed",
                     "turnId": "turn_for_elsewhere", "sessionId": "sess_other",
                     "recoveryAuthority": "READ_ONLY_AGENTS_API",
                     "originalReceiptPath": "research-balanced-001/" + self.tasks[0]["id"] + ".json",
                     "artifactEvidence": {"status": "complete", "artifacts": []}})
        rec_path.write_text(json.dumps(fake))
        scan = rec.census(self.data, self.output)
        self.assertEqual("UNKNOWN_CONFLICT", scan["rows"][0]["status"])
        chosen, _ = resume.eligible_queue(self.data, output=self.output)
        self.assertNotIn(self.tasks[0]["id"], [x["id"] for x in chosen["tasks"]])

    def test_duplicate_modelled_receipt_conflict_remains_unknown(self):
        self.receipt(0)
        self.receipt(0, batch="research-resume-old-001")
        rows = rec.census(self.data, self.output)["rows"]
        self.assertEqual("UNKNOWN_CONFLICT", rows[0]["status"])
        self.assertEqual(2, len(rows[0]["receiptFiles"]))
        claim = self.output / "claims" / (self.tasks[1]["id"] + ".json")
        claim.parent.mkdir(parents=True)
        claim.write_text(json.dumps({
            "schema": 1, "task": self.tasks[1]["id"],
            "commit": self.tasks[1]["sha"]}))
        rows = rec.census(self.data, self.output)["rows"]
        self.assertEqual("UNKNOWN_CLAIMED", rows[1]["status"])
        self.assertEqual("NOT_LAUNCHED", rows[2]["status"])
        chosen, scan = resume.eligible_queue(self.data, output=self.output)
        self.assertEqual(78, len(chosen["tasks"]))
        self.assertEqual(1, scan["counts"]["UNKNOWN_CONFLICT"])

    def test_live_active_blocks_others_until_reconciled(self):
        self.receipt(0, state="input-submit-attempted")
        def fake_get(method, path, key):
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_still_running",
                                  "subagent_id": None, "status": "in_progress"}]}
            return {"id": "sess_receipt_0", "status": "in_progress"}
        with self.assertRaisesRegex(ValueError, "unresolved"):
            resume.eligible_queue(self.data, output=self.output, online=True,
                                  key="synthetic", get=fake_get)
        self.assertEqual("UNKNOWN_ACTIVE",
                         rec.census(self.data, self.output)["rows"][0]["status"])

    def test_old_summary_alone_never_causes_retry_of_known_receipt(self):
        previous = self.receipt(5, batch="research-balanced-001")
        (previous.parent / "parallel-summary-offset-005.json").write_text(
            '{"schema":1,"sessionsLaunched":1,"sessionCompletions":1}')
        batch, scan = resume.eligible_queue(self.data, output=self.output)
        self.assertNotIn(self.tasks[5]["id"], [t["id"] for t in batch["tasks"]])
        self.assertEqual(79, scan["neverLaunched"])
        self.assertTrue(previous.exists())

    def test_unsafe_receipt_is_not_mislabeled_never_launched(self):
        path = self.receipt(0)
        doc = json.loads(path.read_bytes())
        doc["commit"] = "0" * 40
        path.write_text(json.dumps(doc))
        rows = rec.census(self.data, self.output)["rows"]
        self.assertEqual("UNKNOWN_CONFLICT", rows[0]["status"])
        batch, _ = resume.eligible_queue(self.data, output=self.output)
        self.assertNotIn(self.tasks[0]["id"], [t["id"] for t in batch["tasks"]])

    def test_resume_run_requires_explicit_key_and_does_not_call_api(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": ""}):
            with patch.object(resume.parallel, "execute") as network:
                with self.assertRaises(SystemExit):
                    resume.main(["run", "--execute", "--output", str(self.output)])
                network.assert_not_called()


if __name__ == "__main__":
    unittest.main()
