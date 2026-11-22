"""Recovery tests are entirely local: no API keys or paid agent runs."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import cancel_session as recovery


class RecoverSessionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.receipt = Path(self.temp.name) / "task-001.json"
        self.receipt.write_text(json.dumps({
            "schema": 1,
            "task": "task-001",
            "sessionId": "sess_known_1",
            "state": "input-submit-attempted",
            "apiSpendControlMode": "UNLIMITED_EXPLICIT_OPT_IN",
        }))

    def test_read_only_active_never_sends_cancel(self):
        calls = []
        def fake_get(method, path, key):
            calls.append((method, path))
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_001", "subagent_id": None,
                                  "status": "in_progress"}], "has_more": False}
            return {"id": "sess_known_1", "status": "in_progress"}
        cancel = Mock(side_effect=AssertionError("cancel is not authorized"))
        result = recovery.inspect_or_cancel(
            self.receipt, "synthetic-key", get=fake_get, cancel=cancel)
        self.assertEqual("READ_ONLY_ACTIVE_OR_UNCERTAIN", result["status"])
        self.assertEqual("in_progress", result["rootTurnStatus"])
        self.assertFalse(result["cancelRequested"])
        cancel.assert_not_called()
        self.assertEqual(2, len(calls))

    def test_explicit_cancel_of_active_session_checks_terminal(self):
        def fake_get(method, path, key):
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_001", "subagent_id": None,
                                  "status": "in_progress"}]}
            return {"id": "sess_known_1", "status": "in_progress"}
        cancel = Mock(return_value={"cancelDelivery": "accepted",
                                    "cancelConfirmed": True,
                                    "turnTerminalAfterCancelObserved": True,
                                    "cancelRootTurnStatus": "cancelled",
                                    "turnOutcome": "cancelled"})
        outcome = recovery.inspect_or_cancel(
            self.receipt, "synthetic-key", execute_cancel=True,
            get=fake_get, cancel=cancel)
        self.assertTrue(outcome["cancelRequested"])
        self.assertEqual("TERMINAL_CONFIRMED", outcome["status"])
        self.assertEqual("cancelled", outcome["cancelRootTurnStatus"])
        cancel.assert_called_once_with("sess_known_1", "synthetic-key")

    def test_already_terminal_does_not_cancel_again(self):
        def fake_get(method, path, key):
            if path.endswith("/turns?limit=100&order=desc"):
                return {"data": [{"id": "turn_001", "subagent_id": None,
                                  "status": "failed"}]}
            return {"id": "sess_known_1", "status": "idle"}
        cancel = Mock(side_effect=AssertionError("terminal already"))
        result = recovery.inspect_or_cancel(
            self.receipt, "synthetic-key", execute_cancel=True,
            get=fake_get, cancel=cancel)
        self.assertEqual("ALREADY_TERMINAL", result["status"])
        cancel.assert_not_called()

    def test_read_error_never_claims_idle_safe(self):
        from urllib.error import URLError
        def fake_get(method, path, key):
            if path.endswith("/turns?limit=100&order=desc"):
                raise URLError(ConnectionError("private-key-material"))
            return {"id": "sess_known_1", "status": "idle"}
        cancel = Mock()
        result = recovery.inspect_or_cancel(
            self.receipt, "synthetic-key", get=fake_get, cancel=cancel)
        self.assertEqual("READ_ONLY_ACTIVE_OR_UNCERTAIN", result["status"])
        self.assertNotIn("private-key-material", json.dumps(result))
        cancel.assert_not_called()

    def test_uncapped_provenance_and_session_id_required(self):
        bogus = json.loads(self.receipt.read_text())
        bogus["apiSpendControlMode"] = "CAPPED_REQUIRED"
        self.receipt.write_text(json.dumps(bogus))
        with self.assertRaisesRegex(ValueError, "uncapped"):
            recovery.inspect_or_cancel(self.receipt, "synthetic-key",
                                        get=Mock(), cancel=Mock())
        bogus["apiSpendControlMode"] = "UNLIMITED_EXPLICIT_OPT_IN"
        bogus["sessionId"] = "../../other-session"
        self.receipt.write_text(json.dumps(bogus))
        with self.assertRaisesRegex(ValueError, "safe"):
            recovery.inspect_or_cancel(self.receipt, "synthetic-key",
                                        get=Mock(), cancel=Mock())


if __name__ == "__main__":
    unittest.main()
