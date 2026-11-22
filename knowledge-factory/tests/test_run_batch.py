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


    def test_staged_cap_applied_before_any_input(self):
        from urllib.error import HTTPError
        from io import BytesIO
        bad = json.dumps({"error": {"type": "invalid_request_error",
                                   "code": "unknown_parameter",
                                   "param": "spend_control"}}).encode()
        observed = []
        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            observed.append((method, path, payload))
            if path == "/v1/agents/sessions":
                self.assertNotIn("input", payload)
                self.assertNotIn("spend_control", payload)
                return {"id": "sess_staged_1", "status": "idle"}
            if path == "/v1/agents/sessions/sess_staged_1":
                self.assertEqual({"spend_control": {"limit": 200}}, payload)
                return {"id": "sess_staged_1", "status": "idle",
                        "spend_control": {"limit": 200, "consumed": 0}}
            if path.endswith("/events"):
                self.assertIsNotNone(idempotency_key)
                self.assertEqual("agent.session.input.message", payload["events"][0]["type"])
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                return {"has_more": False, "data": [
                    {"id": "turn_staged_1", "subagent_id": None, "status": "completed"}]}
            self.fail("Unexpected API request")
        payload = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 200)
        with patch.object(lab, "agent_session", side_effect=HTTPError(
                     "https://api.openai.com/v1/agents/sessions", 400, "safe",
                     {}, BytesIO(bad))), patch.object(lab, "api_json", side_effect=fake_api):
            receipt = lab.agent_session_with_staged_cap(payload, "synthetic", timeout=5)
        self.assertEqual("completed", receipt["turnOutcome"])
        self.assertEqual("confirmed", receipt["spendControlStatus"])
        self.assertEqual("sess_staged_1", receipt["sessionId"])
        self.assertEqual(["/v1/agents/sessions",
                          "/v1/agents/sessions/sess_staged_1",
                          "/v1/agents/sessions/sess_staged_1/events",
                          "/v1/agents/sessions/sess_staged_1/turns?limit=100&order=desc"],
                         [path for _method, path, _body in observed])

    def test_staged_cap_rejection_never_submits_agent_input(self):
        calls = []
        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            calls.append(path)
            if path == "/v1/agents/sessions":
                return {"id": "sess_staged_2", "status": "idle"}
            if path == "/v1/agents/sessions/sess_staged_2":
                return {"id": "sess_staged_2", "status": "idle",
                        "spend_control": {"limit": None}}
            self.fail("Input must not be submitted without proven cap")
        payload = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 200)
        with patch.object(lab, "api_json", side_effect=fake_api):
            receipt = lab.staged_session_with_confirmed_cap(payload, "synthetic", 1)
        self.assertEqual("unknown", receipt["turnOutcome"])
        self.assertEqual("not-confirmed", receipt["spendControlStatus"])
        self.assertEqual("sess_staged_2", receipt["sessionId"])
        self.assertEqual("spending-limit-not-acknowledged", receipt["stagedFailurePhase"])
        self.assertEqual(2, len(calls))

    def test_non_budget_http_400_does_not_enable_unbounded_fallback(self):
        from urllib.error import HTTPError
        from io import BytesIO
        bad = json.dumps({"error": {"type": "invalid_request_error",
                                   "code": "unknown_parameter",
                                   "param": "agent.model"}}).encode()
        payload = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 200)
        with patch.object(lab, "agent_session", side_effect=HTTPError(
                     "https://api.openai.com/v1/agents/sessions", 400, "safe",
                     {}, BytesIO(bad))), patch.object(lab, "api_json") as remote:
            with self.assertRaises(HTTPError):
                lab.agent_session_with_staged_cap(payload, "synthetic", timeout=5)
        remote.assert_not_called()


    def test_uncapped_opt_in_persists_session_before_input_and_no_spend_control(self):
        recorded = []
        checkpoints = []
        capped = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 200)

        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            self.assertEqual("synthetic-key", key)
            recorded.append((method, path, payload))
            if path == "/v1/agents/sessions":
                self.assertNotIn("input", payload)
                self.assertNotIn("spend_control", payload)
                return {"id": "sess_uncapped_1", "status": "idle"}
            if path.endswith("/events"):
                self.assertIn(("sess_uncapped_1", "input-submit-attempted"), checkpoints)
                self.assertNotIn("spend_control", payload)
                self.assertEqual(202, expected[0])
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                return {"has_more": False, "data": [
                    {"id": "turn_uncapped_1", "subagent_id": None, "status": "failed"}]}
            self.fail("Unexpected API call " + path)
        with patch.object(lab, "api_json", side_effect=fake_api):
            direct = lab.agent_session_uncapped_opt_in(
                capped, "synthetic-key", timeout=60,
                checkpoint=lambda session, phase: checkpoints.append((session, phase)))
        self.assertEqual("failed", direct["turnOutcome"])
        self.assertEqual("unlimited-explicit-opt-in", direct["spendControlStatus"])
        self.assertEqual("not-required", direct["cancelDelivery"])
        self.assertEqual([("sess_uncapped_1", "session-created-idle"),
                          ("sess_uncapped_1", "input-submit-attempted"),
                          ("sess_uncapped_1", "turn-terminal")], checkpoints)
        self.assertEqual(capped["spend_control"], {"limit": 200})

    def test_uncapped_run_checkpoint_is_durable_before_billable_input(self):
        receipt = self.output / self.data["batch"] / (
            self.data["tasks"][0]["id"] + ".json")
        seen = []
        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            if path == "/v1/agents/sessions":
                return {"id": "sess_checkpoint_1", "status": "idle"}
            if path.endswith("/events"):
                prior = json.loads(receipt.read_bytes())
                self.assertEqual("input-submit-attempted", prior["state"])
                self.assertEqual("sess_checkpoint_1", prior["sessionId"])
                seen.append("input-after-persistent-id")
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                return {"has_more": False, "data": [
                    {"id": "turn_checkpoint_1", "subagent_id": None, "status": "failed"}]}
            self.fail("Unexpected API path")
        self.args.allow_uncapped_session = True
        self.args.timeout = 60
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic-key"}):
            with patch.object(lab, "api_json", side_effect=fake_api):
                row = lab.run(self.data, self.args,
                              send=lab.agent_session_uncapped_opt_in)[0]
        self.assertEqual(["input-after-persistent-id"], seen)
        self.assertEqual("UNLIMITED_EXPLICIT_OPT_IN", row["apiSpendControlMode"])
        self.assertTrue(row["localBudgetIsNotApiSpendCap"])
        self.assertEqual("UNKNOWN", row["migrationVerdict"])

    def test_agent_deadline_sends_server_cancel_and_requires_terminal(self):
        time_now = [0.]
        actions = []
        def clock():
            return time_now[0]
        def sleeper(seconds):
            time_now[0] += seconds
        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            actions.append((path, payload))
            if path == "/v1/agents/sessions":
                return {"id": "sess_deadline_1", "status": "idle"}
            if path.endswith("/events"):
                if payload["events"][0]["type"] == "agent.session.input.cancel":
                    self.assertGreaterEqual(clock(), 60)
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                status = ("cancelled" if any(
                    item and item["events"][0]["type"] == "agent.session.input.cancel"
                    for _path, item in actions if _path.endswith("/events"))
                    else "in_progress")
                return {"has_more": False, "data": [
                    {"id": "turn_deadline_1", "subagent_id": None, "status": status}]}
            self.fail("unexpected path")
        payload = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 200)
        with patch.object(lab, "api_json", side_effect=fake_api):
            answer = lab.agent_session_uncapped_opt_in(
                payload, "synthetic-key", timeout=60,
                checkpoint=lambda *_args: None, clock=clock, sleep=sleeper)
        self.assertEqual("cancelled", answer["turnOutcome"])
        self.assertEqual("accepted", answer["cancelDelivery"])
        self.assertTrue(answer["cancelConfirmed"])
        self.assertEqual("uncapped-agent-wall-clock-timeout", answer["failurePhase"])
        self.assertEqual(1, sum(1 for _path, body in actions if body and
                               body.get("events", [{}])[0].get("type") ==
                               "agent.session.input.cancel"))

    def test_transport_failure_after_input_attempt_still_cancels(self):
        from urllib.error import URLError
        seen = []
        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            if path == "/v1/agents/sessions":
                return {"id": "sess_uncertain_1", "status": "idle"}
            if path.endswith("/events"):
                kind = payload["events"][0]["type"]
                seen.append(kind)
                if kind == "agent.session.input.message":
                    raise URLError(ConnectionResetError(10054, "private-token"))
                return {}
            if path.endswith("/turns?limit=100&order=desc"):
                return {"has_more": False, "data": [
                    {"id": "turn_uncertain_1", "subagent_id": None, "status": "cancelled"}]}
            self.fail("unexpected path")
        payload = lab.request_payload(self.data["tasks"][0], "gpt-6-astra", 200)
        with patch.object(lab, "api_json", side_effect=fake_api):
            answer = lab.agent_session_uncapped_opt_in(
                payload, "synthetic-key", timeout=60,
                checkpoint=lambda *_args: None)
        self.assertEqual(["agent.session.input.message", "agent.session.input.cancel"], seen)
        self.assertEqual("cancelled", answer["turnOutcome"])
        self.assertTrue(answer["cancelConfirmed"])
        self.assertEqual("uncapped-input-submit-uncertain", answer["failurePhase"])
        self.assertNotIn("private-token", json.dumps(answer))

    def test_cancel_request_accepted_without_terminal_is_still_unknown(self):
        time_now = [0.]
        def fake_api(method, path, key, *, payload=None, expected=(200,), idempotency_key=None):
            if path.endswith("/events"):
                return {}
            return {"has_more": False, "data": [
                {"id": "turn_running_1", "subagent_id": None, "status": "in_progress"}]}
        with patch.object(lab, "api_json", side_effect=fake_api):
            result = lab.cancel_active_agent_turn(
                "sess_running_1", "synthetic-key",
                clock=lambda: time_now[0],
                sleep=lambda seconds: time_now.__setitem__(0, time_now[0] + seconds),
                grace_seconds=6)
        self.assertEqual("accepted", result["cancelDelivery"])
        self.assertFalse(result["cancelConfirmed"])
        self.assertEqual("grace-expired", result["cancelPollStatus"])
        self.assertEqual("UNKNOWN", result["cancelRootTurnStatus"])


    def test_uncapped_mode_rejects_multiple_sessions_before_api(self):
        self.args.allow_uncapped_session = True
        self.args.max_sessions = 2
        self.args.budget_usd = "4"
        with patch.dict("os.environ", {"OPENAI_API_KEY": "synthetic-key"}):
            with patch.object(lab, "agent_session") as network:
                with self.assertRaisesRegex(ValueError, "exactly one session"):
                    lab.run(self.data, self.args,
                            send=lab.agent_session_uncapped_opt_in)
                network.assert_not_called()


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
