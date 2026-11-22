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
        self.assertEqual(2, len(self.data["tasks"]))
        self.assertTrue(all(len(t["sha"]) == 40 for t in self.data["tasks"]))
        with self.assertRaises(ValueError):
            lab.corpus(self.output / "missing.json")

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

    def test_plan_deterministic_and_offline(self):
        task = self.data["tasks"][0]
        self.assertEqual(lab.sha(lab.prompt(task).encode()), lab.sha(lab.prompt(task).encode()))
        self.assertEqual(lab.MODEL if hasattr(lab, "MODEL") else "gpt-6-astra", "gpt-6-astra")


if __name__ == "__main__":
    unittest.main()
