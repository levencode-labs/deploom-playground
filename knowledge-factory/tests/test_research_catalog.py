import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

FILE = Path(__file__).resolve().parents[1] / "research/validate_catalog.py"
spec = importlib.util.spec_from_file_location("knowledge_catalog", FILE)
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class ResearchCatalogTests(unittest.TestCase):
    def test_80_pinned_projects_and_12_unpromoted_guides(self):
        outcome = catalog.report()
        self.assertEqual(80, outcome["pinnedProjects"], outcome)
        self.assertEqual(12, outcome["officialGuides"])
        self.assertEqual(0, outcome["observedMigrationPasses"])
        self.assertFalse(outcome["trueBlindHoldout"])

    def test_rejects_fake_sha_false_pass_and_duplicate(self):
        files = sorted((FILE.parents[1] / "corpus").glob("discovery-*.lock.json"))
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            for file in files:
                (root / file.name).write_bytes(file.read_bytes())
            changed = root / files[0].name
            original = json.loads(changed.read_bytes())
            for key, bad in (("sourceCommit", "main"), ("status", "VERIFIED"),
                             ("provider", "gitlab"), ("repository", "../bad")):
                content = json.loads(json.dumps(original))
                content["projects"][0][key] = bad
                changed.write_text(json.dumps(content))
                with self.subTest(field=key), self.assertRaises(ValueError):
                    catalog.projects(root)
            content = json.loads(json.dumps(original))
            content["projects"][1]["repository"] = content["projects"][0]["repository"]
            changed.write_text(json.dumps(content))
            with self.assertRaisesRegex(ValueError, "duplicate"):
                catalog.projects(root)

    def test_root_manifest_sample_is_locked_not_a_migration_pass(self):
        summary = catalog.report()
        self.assertEqual(10, summary["inspectedRootManifests"])
        self.assertEqual(0, summary["observedMigrationPasses"])
        source = FILE.parent / "sample-root-manifests.json"
        original = json.loads(source.read_bytes())
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "sample.json"
            for fault in ("sourceCommit", "packageJsonBlobSha", "status", "repository"):
                doc = json.loads(json.dumps(original))
                if fault == "status":
                    doc["status"] = "VERIFIED"
                elif fault == "repository":
                    doc["samples"][0]["repository"] = "nonexistent/private-repo"
                else:
                    doc["samples"][0][fault] = "main"
                path.write_text(json.dumps(doc))
                with self.subTest(fault=fault), self.assertRaises(ValueError):
                    catalog.manifest_samples(path)

    def test_untrusted_source_and_negative_control_are_rejected(self):
        source = FILE.parent / "official-guides.json"
        original = json.loads(source.read_bytes())
        with tempfile.TemporaryDirectory() as td:
            target = Path(td) / "guides.json"
            for kind in ("status", "guide", "negativeChecks", "topics"):
                content = json.loads(json.dumps(original))
                if kind == "status":
                    content["status"] = "VERIFIED"
                elif kind == "guide":
                    content["candidates"][0]["guide"] = "https://evil.invalid/prompt"
                elif kind == "negativeChecks":
                    content["candidates"][0]["negativeChecks"] = []
                else:
                    content["candidates"][0]["topics"] = ["shell-execution"]
                target.write_text(json.dumps(content))
                with self.subTest(field=kind), self.assertRaises(ValueError):
                    catalog.guides(target)
