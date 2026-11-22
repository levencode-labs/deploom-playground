"""No-credit acceptance for parallel OpenAI Agents API dispatch."""
import copy
import importlib.util
import json
import tempfile
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("cloud_parallel", ROOT / "parallel_batch.py")
# run_batch.py resolves from the script's directory, as it does in CLI mode
import sys
sys.path.insert(0, str(ROOT))
import run_batch as single
parallel = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parallel)


class ParallelBatchTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)
        original = single.corpus(ROOT / "corpus/projects.lock.json")["tasks"][0]
        self.data = {"schema": 1, "batch": "parallel-negative-controls",
                     "tasks": [dict(copy.deepcopy(original), id="task-" + str(i).zfill(3))
                               for i in range(8)]}
        self.args = SimpleNamespace(
            max_sessions=4, workers=4, budget_usd="8", reserve_usd="2",
            timeout=180, model="gpt-6-astra", output=self.output, execute=True)

    def test_offline_plan_is_deterministic_and_uses_no_credits(self):
        x = parallel.plan(self.data, self.args)
        self.assertEqual(x, parallel.plan(self.data, self.args))
        self.assertEqual("DRY_RUN_ZERO_CREDITS", x["status"])
        self.assertEqual(4, x["selectedSessions"])
        self.assertEqual(4, x["workers"])
        self.assertEqual("8", x["plannedReservationsUsd"])
        self.assertEqual(200, x["spendLimitPerSessionCents"])

    def test_four_cloud_sessions_run_in_parallel_and_keep_unknown_migration(self):
        simultaneous = threading.Barrier(4)
        seen = []
        lock = threading.Lock()

        def sender(payload, key, timeout):
            self.assertEqual("local-synthetic-key", key)
            self.assertEqual({"limit": 200}, payload["spend_control"])
            with lock:
                seen.append(payload["input"])
            simultaneous.wait(timeout=10)
            return {"turnOutcome": "completed", "sessionId": "sess_mock_001",
                    "turnId": "turn_mock_001"}

        def receipts(session_id, turn_id, key):
            return {"status": "complete", "artifacts": [
                {"path": "/workspace/outputs/migration-report.json",
                 "sha256": "a" * 64}],
                "authority": "UNTRUSTED_AGENT_OUTPUT"}

        with patch.dict("os.environ", {"OPENAI_API_KEY": "local-synthetic-key"}):
            with patch.object(single, "artifact_receipts", side_effect=receipts):
                report = parallel.execute(self.data, self.args, send=sender)
        self.assertEqual(4, len(seen))
        self.assertEqual(4, report["sessionsLaunched"])
        self.assertEqual(4, report["sessionCompletions"])
        self.assertEqual("8", report["launchedReservationsUsd"])
        self.assertEqual("NOT_RUN", report["independentVerification"])
        self.assertEqual(0, report["verifiedKnowledgeCards"])
        self.assertTrue(all(x["migrationVerdict"] == "UNKNOWN" for x in report["results"]))
        self.assertNotIn("local-synthetic-key", json.dumps(report))
        for task in self.data["tasks"][:4]:
            receipt = self.output / self.data["batch"] / (task["id"] + ".json")
            self.assertTrue(receipt.is_file())
        self.assertTrue((self.output / self.data["batch"] / "parallel-summary.json").is_file())

    def test_unknown_outcomes_stop_later_spending_without_retries(self):
        self.args.max_sessions = 8
        self.args.workers = 2
        self.args.budget_usd = "16"
        hits = []
        def bad(payload, key, timeout):
            hits.append(payload["input"])
            raise TimeoutError("synthetic lost stream")
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic-key"}):
            report = parallel.execute(self.data, self.args, send=bad)
        self.assertEqual(2, report["sessionsLaunched"])
        self.assertEqual(2, len(hits))
        self.assertEqual(6, len(report["unlaunched"]))
        self.assertTrue(report["stoppedOnUncertainEvidence"])
        self.assertEqual(0, report["sessionCompletions"])
        self.assertFalse(any("secret" in str(x).lower() for x in report["results"]))

    def test_no_key_no_execute_and_budget_boundaries(self):
        self.args.execute = False
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic"}):
            with self.assertRaisesRegex(ValueError, "explicit"):
                parallel.execute(self.data, self.args)
        self.args.execute = True
        with patch.dict("os.environ", {"OPENAI_API_KEY": ""}):
            with self.assertRaisesRegex(ValueError, "absent"):
                parallel.execute(self.data, self.args)
        self.args.budget_usd = "7"
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic"}):
            with self.assertRaisesRegex(ValueError, "ceiling"):
                parallel.execute(self.data, self.args)
        self.args.budget_usd = "8"
        self.args.workers = 9
        with self.assertRaisesRegex(ValueError, "Parallel"):
            parallel.plan(self.data, self.args)

    def test_reuse_does_not_charge_again_or_use_different_identity(self):
        calls = []
        def bad(payload, key, timeout):
            calls.append(1)
            raise TimeoutError("synthetic disconnect")
        self.args.max_sessions = 1
        self.args.workers = 1
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic"}):
            first = parallel.execute(self.data, self.args, send=bad)
            self.assertEqual(1, len(calls))
            with self.assertRaisesRegex(ValueError, "summary"):
                parallel.execute(self.data, self.args, send=bad)
            prior = self.output / self.data["batch"] / (self.data["tasks"][0]["id"] + ".json")
            record = json.loads(prior.read_bytes())
            record["commit"] = "0" * 40
            prior.write_text(json.dumps(record))
            local = SimpleNamespace(execute=True, budget_usd="2", reserve_usd="2",
                                    max_sessions=1, output=self.output, model="gpt-6-astra",
                                    timeout=180)
            with self.assertRaisesRegex(ValueError, "different source identity"):
                single.run({"schema": 1, "batch": self.data["batch"],
                            "tasks": [self.data["tasks"][0]]}, local, send=bad)
        self.assertEqual(1, len(calls))


if __name__ == "__main__":
    unittest.main()
