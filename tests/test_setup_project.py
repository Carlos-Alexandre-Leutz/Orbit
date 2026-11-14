import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from backlog import parse_backlog  # noqa: E402
from setup_project import build_updates, mutation  # noqa: E402

FIELDS = {
    "Phase": {"id": "FP", "options": {"F1": "o-f1", "F2": "o-f2", "F3": "o-f3", "F4": "o-f4"}},
    "Priority": {"id": "FQ", "options": {"must-have": "o-must", "cuttable": "o-cut"}},
}
SAMPLE = "## E0. A [must]\n\n### PBI-01 [F2] B\n- T: C\n- T: [cut] D\n\n## E9. No marker\n\n### PBI-39 [F4] E\n- T: F\n"


class BuildUpdatesTests(unittest.TestCase):
    def setUp(self):
        self.items = parse_backlog(SAMPLE)
        self.project_items = [{"id": f"id-{i.key}", "title": i.title} for i in self.items]

    def values(self, key):
        return {(f, o) for item, f, o in build_updates(self.items, self.project_items, FIELDS) if item == f"id-{key}"}

    def test_pbi_gets_phase_and_priority(self):
        self.assertEqual(self.values("PBI-01"), {("FP", "o-f2"), ("FQ", "o-must")})

    def test_cut_task_gets_cuttable(self):
        self.assertIn(("FQ", "o-cut"), self.values("PBI-01/2"))

    def test_epic_has_priority_but_no_phase(self):
        self.assertEqual(self.values("E0"), {("FQ", "o-must")})

    def test_item_without_marker_gets_no_priority(self):
        self.assertEqual(self.values("PBI-39/1"), {("FP", "o-f4")})
        self.assertEqual(self.values("E9"), set())

    def test_items_missing_from_the_project_are_skipped(self):
        self.assertEqual(build_updates(self.items, [], FIELDS), [])

    def test_real_backlog_fills_phase_for_every_pbi_and_task(self):
        items = parse_backlog((ROOT / "docs" / "00-backlog.md").read_text(encoding="utf-8"))
        project_items = [{"id": f"id-{i.key}", "title": i.title} for i in items]
        phased = {item for item, field, _ in build_updates(items, project_items, FIELDS) if field == "FP"}
        self.assertEqual(len(phased), sum(i.kind in ("pbi", "task") for i in items))

    def test_mutation_has_one_alias_per_update(self):
        text = mutation("P", [("i1", "f1", "o1"), ("i2", "f2", "o2")])
        self.assertIn("u0:", text)
        self.assertIn("u1:", text)
        self.assertEqual(text.count("updateProjectV2ItemFieldValue"), 2)


if __name__ == "__main__":
    unittest.main()
