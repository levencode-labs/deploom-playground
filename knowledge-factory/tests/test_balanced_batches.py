import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "research"))
from combine_batches import combined

class BalancedCloudTaskTests(unittest.TestCase):
    def test_eight_first_wave_repos_cover_distinct_dependency_lanes(self):
        batch = combined()
        self.assertEqual("research-balanced-001", batch["batch"])
        self.assertEqual(80, len(batch["tasks"]))
        self.assertEqual(80, len({x["id"] for x in batch["tasks"]}))
        self.assertEqual(8, len({t["repository"] for t in batch["tasks"][:8]}))
        self.assertTrue(all(len(t["sha"]) == 40 for t in batch["tasks"]))
        self.assertEqual(batch, combined())

    def test_rejects_duplicate_or_disconnected_source_batch(self):
        from validate_catalog import projects
        rows = projects()
        duplicate = rows + [rows[0]]
        with self.assertRaises(ValueError):
            combined(duplicate)

if __name__ == "__main__":
    unittest.main()
