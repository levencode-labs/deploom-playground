import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "research"
sys.path.insert(0, str(ROOT))
import validate_catalog as validate
import prepare_batches as prepare


class SourceExactBatchTests(unittest.TestCase):
    def test_public_80_source_refs_are_pinned_in_eight_offline_lanes(self):
        source = validate.projects()
        self.assertEqual(80, len(source))
        result = prepare.generate_batches(source)
        self.assertEqual(8, len(result))
        for lane, batch in result.items():
            self.assertEqual(10, len(batch["tasks"]), lane)
            self.assertRegex(batch["batch"], r"^[a-z0-9_-]{4,64}$")
            for task in batch["tasks"]:
                self.assertEqual(set(task), {"id", "provider", "repository", "sha", "goal"})
                self.assertEqual(40, len(task["sha"]))
                self.assertGreaterEqual(len(task["goal"]), 15)
                self.assertLessEqual(len(task["goal"]), 500)
                self.assertIn("NOT_APPLICABLE", task["goal"])
        status = prepare.manifest(source, [])
        self.assertEqual("NOT_EXECUTED", status["status"])
        self.assertFalse(status["holdoutWasBlinded"])

    def test_private_seed_deterministic_split_and_no_published_selection(self):
        sources = validate.projects()
        key = "synthetic-ci-only-32-byte-secret-not-a-production-key"
        training, holdout = prepare.split_corpus(sources, key, 16)
        again, expected = prepare.split_corpus(sources, key, 16)
        self.assertEqual(training, again)
        self.assertEqual(holdout, expected)
        self.assertEqual(64, len(training))
        self.assertEqual(16, len(holdout))
        self.assertFalse({p["repository"] for p in training} &
                         {p["repository"] for p in holdout})
        manifest = prepare.manifest(training, holdout)
        self.assertEqual(16, manifest["withheldCount"])
        self.assertNotIn(holdout[0]["repository"], str(manifest))
        self.assertTrue(manifest["holdoutWasBlinded"])

    def test_rejects_short_seed_or_incorrect_holdout(self):
        source = validate.projects()
        for seed in ("", "abc", None):
            with self.subTest(seed=seed):
                if seed is None:
                    self.assertEqual((source, []), prepare.split_corpus(source, None))
                else:
                    with self.assertRaises(ValueError):
                        prepare.split_corpus(source, seed)
        with self.assertRaises(ValueError):
            prepare.split_corpus(source, "x" * 32, 79)


if __name__ == "__main__":
    unittest.main()
