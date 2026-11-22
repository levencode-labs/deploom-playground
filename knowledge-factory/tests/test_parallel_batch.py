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

    def test_offset_selects_nonoverlapping_waves_without_repeating_paid_sources(self):
        self.args.offset = 4
        self.args.max_sessions = 4
        self.args.budget_usd = "8"
        second = parallel.plan(self.data, self.args)
        self.assertEqual(4, second["offset"])
        self.assertEqual(4, second["selectedSessions"])
        self.assertEqual([task["id"] for task in self.data["tasks"][4:8]],
                         [item["id"] for item in second["tasks"]])
        self.args.offset = 8
        with self.assertRaisesRegex(ValueError, "offset"):
            parallel.plan(self.data, self.args)
        self.args.offset = -1
        with self.assertRaisesRegex(ValueError, "offset"):
            parallel.plan(self.data, self.args)

    def test_uncapped_opt_in_is_single_session_and_explicit(self):
        self.args.allow_uncapped_session = True
        with self.assertRaisesRegex(ValueError, "exactly one session"):
            parallel.plan(self.data, self.args)
        self.args.max_sessions = 1
        self.args.workers = 1
        self.args.budget_usd = "2"
        offline = parallel.plan(self.data, self.args)
        self.assertIsNone(offline["spendLimitPerSessionCents"])
        self.assertEqual("UNLIMITED_EXPLICIT_OPT_IN", offline["apiSpendControlMode"])
        self.assertIn("NOT a spending ceiling", offline["note"])

        sent = []
        def fake_api(method, path, key, *, payload=None, expected=(200,),
                     idempotency_key=None):
            sent.append((path, payload))
            if path == "/v1/agents/sessions":
                self.assertNotIn("spend_control", payload)
                self.assertNotIn("input", payload)
                return {"id": "sess_parallel_1", "status": "idle"}
            if path.endswith("/events"):
                self.assertEqual("agent.session.input.message",
                                 payload["events"][0]["type"])
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                return {"has_more": False, "data": [
                    {"id": "turn_parallel_1", "subagent_id": None, "status": "failed"}]}
            self.fail("Unexpected API path")
        with patch.dict("os.environ", {"OPENAI_API_KEY": "secret-synthetic"}):
            with patch.object(single, "api_json", side_effect=fake_api):
                report = parallel.execute(self.data, self.args)
        self.assertEqual(1, report["sessionsLaunched"])
        self.assertEqual(0, report["sessionCompletions"])
        self.assertEqual("UNLIMITED_EXPLICIT_OPT_IN", report["apiSpendControlMode"])
        self.assertIsNone(report["spendLimitPerSessionCents"])
        self.assertEqual(3, len(sent))
        self.assertIn("spend_control", single.request_payload(
            self.data["tasks"][0], "gpt-6-astra", 200))
        receipt = json.loads((self.output / self.data["batch"] /
                              (self.data["tasks"][0]["id"] + ".json")).read_bytes())
        self.assertEqual("UNLIMITED_EXPLICIT_OPT_IN", receipt["apiSpendControlMode"])
        self.assertEqual("sess_parallel_1", receipt["sessionId"])


    def test_mass_sol_four_concurrent_uncapped_sessions_with_checkpoints(self):
        """Exercises real controller and fake provider, not paid network."""
        self.args.allow_uncapped_batch = True
        self.args.max_sessions = 4
        self.args.workers = 4
        self.args.model = "gpt-6.2-sol"
        self.args.budget_usd = "8"
        self.args.timeout = 60
        self.data["batch"] = "parallel-sol-staged-batch"
        barrier = threading.Barrier(4)
        lock = threading.Lock()
        created = []
        observations = []

        def provider(method, path, key, *, payload=None, expected=(200,),
                     idempotency_key=None):
            self.assertEqual("local-synthetic-key", key)
            if path == "/v1/agents/sessions":
                self.assertNotIn("spend_control", payload)
                self.assertNotIn("input", payload)
                self.assertEqual({"enabled": False},
                                 payload["agent"]["multi_agent"])
                with lock:
                    ident = "sess_mass_" + str(len(created) + 1).zfill(3)
                    created.append(ident)
                barrier.wait(timeout=10)
                return {"id": ident, "status": "idle"}
            if path.endswith("/events"):
                with lock:
                    observations.append(payload["events"][0]["type"])
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_mass_001",
                                  "subagent_id": None, "status": "completed"}],
                        "has_more": False}
            self.fail("Unexpected API method/path")

        def artifacts(session_id, turn_id, key):
            return {"status": "complete", "artifacts": [
                {"path": "/workspace/outputs/migration-report.json",
                 "sha256": "a" * 64},
                {"path": "/workspace/outputs/commands.json",
                 "sha256": "b" * 64}],
                "authority": "UNTRUSTED_AGENT_OUTPUT"}
        with patch.dict("os.environ", {"OPENAI_API_KEY": "local-synthetic-key"}):
            with patch.object(single, "api_json", side_effect=provider):
                with patch.object(single, "artifact_receipts", side_effect=artifacts):
                    with patch.object(single, "make_progress_logger",
                                      return_value=lambda *_args, **_kw: None):
                        report = parallel.execute(self.data, self.args)
        self.assertEqual(4, report["sessionsLaunched"])
        self.assertEqual(4, report["sessionCompletions"])
        self.assertEqual(4, len(created))
        self.assertEqual(4, len(observations))
        self.assertEqual("UNLIMITED_EXPLICIT_OPT_IN", report["apiSpendControlMode"])
        self.assertTrue(report["uncappedMultiSessionBatch"])
        self.assertTrue(report["subagentsDisabled"])
        self.assertEqual("gpt-6.2-sol", report["model"])
        self.assertIsNone(report["spendLimitPerSessionCents"])
        self.assertEqual("NOT_RUN", report["independentVerification"])
        self.assertEqual(0, report["verifiedKnowledgeCards"])
        for task in self.data["tasks"][:4]:
            receipt = self.output / self.data["batch"] / (task["id"] + ".json")
            row = json.loads(receipt.read_bytes())
            self.assertTrue(row["sessionId"].startswith("sess_mass_"))
            self.assertEqual("completed", row["turnOutcome"])
            self.assertEqual("UNLIMITED_EXPLICIT_OPT_IN", row["apiSpendControlMode"])

    def test_uncapped_mass_rejects_unsafe_parallelism_and_repeated_tasks(self):
        self.args.allow_uncapped_batch = True
        self.args.model = "gpt-6.2-sol"
        self.args.max_sessions = 8
        self.args.budget_usd = "16"
        self.args.workers = 5
        with self.assertRaisesRegex(ValueError, "at most 4 workers"):
            parallel.plan(self.data, self.args)
        self.args.workers = 4
        self.args.model = "gpt-6-astra"
        with self.assertRaisesRegex(ValueError, "Sol or Luna"):
            parallel.plan(self.data, self.args)
        self.args.model = "gpt-6.2-sol"
        self.args.allow_uncapped_session = True
        with self.assertRaisesRegex(ValueError, "exactly one uncapped mode"):
            parallel.plan(self.data, self.args)
        self.args.allow_uncapped_session = False
        self.args.offset = 3
        with self.assertRaisesRegex(ValueError, "silently truncate"):
            parallel.plan(self.data, self.args)
        self.args.offset = 0
        blocked = self.output / self.data["batch"] / (self.data["tasks"][1]["id"] + ".json")
        blocked.parent.mkdir(parents=True, exist_ok=True)
        blocked.write_text('{"state":"reserved"}')
        with patch.dict("os.environ", {"OPENAI_API_KEY": "local-synthetic-key"}):
            with patch.object(single, "api_json") as network:
                with self.assertRaisesRegex(ValueError, "existing attempted tasks"):
                    parallel.execute(self.data, self.args)
                network.assert_not_called()

    def test_mass_uncertain_turn_stops_scheduling_new_cloud_sends(self):
        self.args.allow_uncapped_batch = True
        self.args.model = "gpt-6.2-sol"
        self.args.max_sessions = 8
        self.args.workers = 2
        self.args.budget_usd = "16"
        calls = []
        def lost(_payload, _key, timeout):
            calls.append(timeout)
            raise TimeoutError("simulated lost provider response")
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic"}):
            report = parallel.execute(self.data, self.args, send=lost)
        self.assertEqual(2, len(calls))
        self.assertEqual(2, report["sessionsLaunched"])
        self.assertEqual(6, len(report["unlaunched"]))
        self.assertTrue(report["stoppedOnUncertainEvidence"])


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
