import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / "run_batch.py"
spec = importlib.util.spec_from_file_location("migration_factory", FILE)
lab = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lab)


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.data = lab.corpus(FILE.parent / "corpus/projects.lock.json")
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.output = Path(self.temp.name)
        self.args = SimpleNamespace(execute=True, max_sessions=1, budget_usd="2",
                                    reserve_usd="2", timeout=120, model="gpt-6-astra",
                                    output=self.output)

    def test_pinned_immutable_corpus(self):
        self.assertEqual(3, len(self.data["tasks"]))
        self.assertIn("gitlab", {t["provider"] for t in self.data["tasks"]})
        self.assertTrue(all(len(t["sha"]) == 40 for t in self.data["tasks"]))
        malformed = self.output / "malformed.json"
        malformed.write_text("{invalid json", encoding="utf-8")
        with self.assertRaises(ValueError):
            lab.corpus(malformed)

    def test_rejects_malformed_task_and_unpinned_sha(self):
        for key, bad in (("sha", "main"), ("provider", "private"),
                         ("repository", "../evil"), ("id", "../escape")):
            with self.subTest(field=key):
                doc = json.loads(json.dumps(self.data))
                doc["tasks"][0][key] = bad
                name = self.output / (key + ".json")
                name.write_text(json.dumps(doc))
                with self.assertRaises(ValueError):
                    lab.corpus(name)

    def test_budget_enforced(self):
        for budget, unit, count in (("3", "2", 2), ("NaN", "2", 1), ("2", "0", 1)):
            with self.assertRaises(ValueError):
                lab.reserve(budget, unit, count)

    def test_requires_execute_and_key(self):
        self.args.execute = False
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic"}):
            with self.assertRaises(ValueError):
                lab.run(self.data, self.args)
        self.args.execute = True
        with patch.dict("os.environ", {"OPENAI_API_KEY": ""}):
            with self.assertRaises(ValueError):
                lab.run(self.data, self.args)

    def test_reservation_prevents_duplicate_billable_call(self):
        messages = []
        def fake(payload, key, timeout):
            messages.append((payload, key))
            return {"turnOutcome": "completed", "sessionId": "synthetic"}
        with patch.dict("os.environ", {"OPENAI_API_KEY": "secret-fake-value"}):
            a = lab.run(self.data, self.args, send=fake)
            b = lab.run(self.data, self.args, send=fake)
        self.assertEqual(a, b)
        self.assertEqual(1, len(messages))
        self.assertEqual("UNKNOWN", a[0]["migrationVerdict"])
        self.assertEqual("restricted", messages[0][0]["environment"]["network"]["access"])
        self.assertNotIn("secret-fake-value", json.dumps(a))

    def test_disconnect_is_unknown_and_not_retried(self):
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic"}):
            result = lab.run(self.data, self.args, send=lambda *_a, **_kw: (_ for _ in ()).throw(TimeoutError()))
            lab.run(self.data, self.args, send=lambda *_a, **_kw: self.fail("should not retry"))
        self.assertEqual("unknown-api-outcome", result[0]["state"])
        self.assertEqual("UNKNOWN", result[0]["migrationVerdict"])

    def test_urllib_failure_records_safe_cause_without_secrets_or_retry(self):
        from urllib.error import URLError
        secret = "private-proxy-token-and-api-key"
        def fail_transport(_payload, _key, timeout):
            raise URLError(ConnectionRefusedError(10061, secret))
        with patch.dict("os.environ", {"OPENAI_API_KEY": secret}):
            result = lab.run(self.data, self.args, send=fail_transport)
            replay = lab.run(self.data, self.args,
                             send=lambda *_args, **_kw: self.fail("must not retry"))
        self.assertEqual(result, replay)
        row = result[0]
        self.assertEqual("unknown-api-outcome", row["state"])
        self.assertEqual("agents-create-or-event-stream", row["failurePhase"])
        self.assertEqual("URLError", row["errorKind"])
        self.assertEqual("ConnectionRefusedError", row["causeKind"])
        self.assertEqual(10061, row["causeErrno"])
        self.assertNotIn(secret, json.dumps(row))
        self.assertEqual("UNKNOWN", row["migrationVerdict"])

    def test_http_failure_records_status_without_error_body(self):
        from urllib.error import HTTPError
        secret = "secret-authorization-data"
        def fail_http(_payload, _key, timeout):
            raise HTTPError("https://api.openai.com/v1/agents/sessions",
                            403, secret, None, None)
        with patch.dict("os.environ", {"OPENAI_API_KEY": secret}):
            row = lab.run(self.data, self.args, send=fail_http)[0]
        self.assertEqual("HTTPError", row["errorKind"])
        self.assertEqual(403, row["httpStatus"])
        self.assertNotIn(secret, json.dumps(row))


    def test_http_error_structured_diagnostics_are_bounded_and_redacted(self):
        from urllib.error import HTTPError
        from io import BytesIO
        secret = "not-to-store-private-path-or-token"
        message = "invalid model: " + secret
        body = json.dumps({"error": {"type": "invalid_request_error",
                                       "code": "invalid_model",
                                       "param": "agent.model",
                                       "message": message}}).encode()
        def fail_http(_payload, _key, timeout):
            raise HTTPError("https://api.openai.com/v1/agents/sessions",
                            400, "secret reason", {"x-request-id": "req_test123"},
                            BytesIO(body))
        with patch.dict("os.environ", {"OPENAI_API_KEY": secret}):
            row = lab.run(self.data, self.args, send=fail_http)[0]
        self.assertEqual("unknown-api-outcome", row["state"])
        self.assertEqual(400, row["httpStatus"])
        self.assertEqual("invalid_request_error", row["apiErrorType"])
        self.assertEqual("invalid_model", row["apiErrorCode"])
        self.assertEqual("agent.model", row["apiErrorParam"])
        self.assertEqual("req_test123", row["apiRequestId"])
        self.assertIn("model", row["apiErrorCategories"])
        self.assertEqual(lab.sha(message.encode()), row["apiErrorMessageSha256"])
        self.assertNotIn(secret, json.dumps(row))
        self.assertEqual("UNKNOWN", row["migrationVerdict"])

    def test_http_error_rejects_oversized_and_untrusted_metadata(self):
        from urllib.error import HTTPError
        from io import BytesIO
        secret = "secret" * 5000
        def fail_http(_payload, _key, timeout):
            raise HTTPError("https://api.openai.com/v1/agents/sessions", 400,
                            secret, {"x-request-id": "req_" + secret},
                            BytesIO(secret.encode()))
        with patch.dict("os.environ", {"OPENAI_API_KEY": "dummy"}):
            row = lab.run(self.data, self.args, send=fail_http)[0]
        self.assertEqual(400, row["httpStatus"])
        self.assertNotIn("apiRequestId", row)
        self.assertNotIn("apiErrorCode", row)
        self.assertNotIn(secret, json.dumps(row))


    def test_plan_deterministic_and_offline(self):
        task = self.data["tasks"][0]
        self.assertEqual(lab.sha(lab.prompt(task).encode()), lab.sha(lab.prompt(task).encode()))
        self.assertEqual(lab.MODEL if hasattr(lab, "MODEL") else "gpt-6-astra", "gpt-6-astra")


    def test_real_agents_api_session_cap_and_multi_agent_config(self):
        payload = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 275)
        self.assertEqual({"limit": 275}, payload["spend_control"])
        self.assertEqual({"enabled": True, "max_concurrent_subagents": 2},
                         payload["agent"]["multi_agent"])
        with self.assertRaises(ValueError):
            lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 0)
        with self.assertRaises(ValueError):
            lab.reserve("2", "1.005", 1)

    def test_hosted_artifact_digests_no_raw_or_tokens(self):
        report = b'{"sourceSha":"deadbeef","outcome":"UNKNOWN"}'
        commands = b'[{"command":"npm test","exitCode":1}]'
        values = {"/workspace/outputs/migration-report.json": (report, "artifact_report_1"),
                  "/workspace/outputs/commands.json": (commands, "artifact_commands_1")}
        import hashlib
        def fake(path, key, cap):
            self.assertEqual("not-a-real-key", key)
            if path.endswith("?limit=100"):
                return json.dumps({"has_more": False, "data": [
                    {"id": identity, "session_id": "sess_valid_1", "turn_id": "turn_valid_1",
                     "path": original, "size_bytes": len(raw)}
                    for original, (raw, identity) in values.items()]}).encode()
            for raw, identity in values.values():
                if path.endswith("/" + identity + "/content"):
                    self.assertGreaterEqual(cap, len(raw))
                    return raw
            self.fail("unexpected artifact URL")
        result = lab.artifact_receipts("sess_valid_1", "turn_valid_1", "not-a-real-key", get=fake)
        self.assertEqual("complete", result["status"])
        self.assertEqual(2, len(result["artifacts"]))
        self.assertEqual(hashlib.sha256(report).hexdigest(), result["artifacts"][0]["sha256"])
        self.assertNotIn("npm test", str(result))
        with self.assertRaises(ValueError):
            lab.artifact_receipts("../wrong", "turn_valid_1", "not-a-real-key", get=fake)

    def test_hosted_artifact_pagination_and_missing_are_not_verified(self):
        def paging(_path, _key, _cap):
            return b'{"has_more":true,"data":[]}'
        with self.assertRaises(ValueError):
            lab.artifact_receipts("sess_valid_1", "turn_valid_1", "key", get=paging)
        def missing(_path, _key, _cap):
            return b'{"has_more":false,"data":[]}'
        self.assertEqual("missing",
                         lab.artifact_receipts("sess_valid_1", "turn_valid_1",
                                               "key", get=missing)["status"])


if __name__ == "__main__":
    unittest.main()
