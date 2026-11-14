import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from backlog import parse_backlog, render_body  # noqa: E402
from import_backlog import run_import, run_verify  # noqa: E402

SAMPLE = """# Backlog

## E0. Process foundation [must]

### PBI-01 [F1] GitHub workflow
- T: Create labels
- T: [cut] Add a nice extra

## E10. MCP [cut]

### PBI-40 [F4] MCP server
- T: Expose one tool
"""


class FakeGh:
    def __init__(self, existing=(), links=()):
        self.issues = [{"number": n, "title": t, "labels": [{"name": x} for x in labels]} for n, t, labels in existing]
        self.created, self.edited = [], []
        self.links = set(links)  # (parent number, child number)

    def list_issues(self):
        return self.issues

    def create_issue(self, title, body, labels):
        number = 100 + len(self.created)
        self.created.append((number, title, body, labels))
        return number

    def edit_issue(self, number, body):
        self.edited.append((number, body))

    def list_sub_issues(self, number):
        return {child for parent, child in self.links if parent == number}

    def add_sub_issue(self, parent, child):
        self.links.add((parent, child))


class ParseTests(unittest.TestCase):
    def test_parses_hierarchy_titles_and_labels(self):
        items = {i.key: i for i in parse_backlog(SAMPLE)}
        self.assertEqual(items["E0"].title, "E0: Process foundation")
        self.assertEqual(items["PBI-01"].title, "PBI-01: GitHub workflow")
        self.assertEqual(items["PBI-01/1"].title, "Create labels")
        self.assertEqual(items["PBI-01/1"].labels, ["task", "must-have", "E0", "F1"])

    def test_cut_marker_is_removed_from_title_and_becomes_a_label(self):
        items = {i.key: i for i in parse_backlog(SAMPLE)}
        self.assertEqual(items["PBI-01/2"].title, "Add a nice extra")
        self.assertIn("cuttable", items["PBI-01/2"].labels)

    def test_cut_epic_makes_its_children_cuttable(self):
        items = {i.key: i for i in parse_backlog(SAMPLE)}
        self.assertEqual(items["E10"].labels, ["epic", "cuttable", "E10"])
        self.assertIn("cuttable", items["PBI-40"].labels)
        self.assertIn("cuttable", items["PBI-40/1"].labels)

    def test_epic_without_marker_has_no_priority_label(self):
        items = {i.key: i for i in parse_backlog("## E9. Observability\n\n### PBI-39 [F2] LLM observability\n- T: Add traces\n")}
        self.assertEqual(items["E9"].labels, ["epic", "E9"])
        self.assertEqual(items["PBI-39/1"].labels, ["task", "E9", "F2"])

    def test_real_backlog_counts(self):
        items = parse_backlog((ROOT / "docs" / "00-backlog.md").read_text(encoding="utf-8"))
        counts = {k: sum(i.kind == k for i in items) for k in ("epic", "pbi", "task")}
        self.assertEqual(counts, {"epic": 14, "pbi": 54, "task": 178})

    def test_titles_are_unique(self):
        items = parse_backlog((ROOT / "docs" / "00-backlog.md").read_text(encoding="utf-8"))
        titles = [i.title for i in items]
        self.assertEqual(len(titles), len(set(titles)))


class ImportTests(unittest.TestCase):
    def setUp(self):
        self.items = parse_backlog(SAMPLE)

    def test_dry_run_creates_nothing(self):
        gh = FakeGh()
        run_import(self.items, gh, dry_run=True)
        self.assertEqual(gh.created, [])

    def test_creates_everything_in_order_and_links_children(self):
        gh = FakeGh()
        run_import(self.items, gh, dry_run=False)
        self.assertEqual(len(gh.created), 7)
        self.assertEqual(gh.created[0][1], "E0: Process foundation")
        by_title = {t: n for n, t, _, _ in gh.created}
        task_body = next(b for _, t, b, _ in gh.created if t == "Create labels")
        self.assertIn(f"Parent PBI: #{by_title['PBI-01: GitHub workflow']} (PBI-01)", task_body)
        pbi_edit = dict(gh.edited)[by_title["PBI-01: GitHub workflow"]]
        self.assertIn(f"- [ ] #{by_title['Create labels']} Create labels", pbi_edit)

    def test_running_again_creates_no_duplicates(self):
        first = FakeGh()
        run_import(self.items, first, dry_run=False)
        second = FakeGh([(n, t, labels) for n, t, _, labels in first.created])
        run_import(self.items, second, dry_run=False)
        self.assertEqual(second.created, [])
        self.assertEqual(second.edited, [])
        self.assertEqual(second.links, first.links)

    def test_every_child_becomes_a_sub_issue_of_its_parent(self):
        gh = FakeGh()
        run_import(self.items, gh, dry_run=False)
        n = {t: num for num, t, _, _ in gh.created}
        self.assertEqual(gh.links, {
            (n["E0: Process foundation"], n["PBI-01: GitHub workflow"]),
            (n["PBI-01: GitHub workflow"], n["Create labels"]),
            (n["PBI-01: GitHub workflow"], n["Add a nice extra"]),
            (n["E10: MCP"], n["PBI-40: MCP server"]),
            (n["PBI-40: MCP server"], n["Expose one tool"]),
        })

    def test_links_issues_that_already_exist_without_a_link(self):
        existing = [(n, i.title, i.labels) for n, i in enumerate(self.items, start=1)]
        gh = FakeGh(existing)
        run_import(self.items, gh, dry_run=False)
        self.assertEqual(gh.created, [])
        self.assertEqual(len(gh.links), 5)

    def test_dry_run_adds_no_links(self):
        gh = FakeGh([(n, i.title, i.labels) for n, i in enumerate(self.items, start=1)])
        run_import(self.items, gh, dry_run=True)
        self.assertEqual(gh.links, set())

    def test_creates_only_what_is_missing(self):
        gh = FakeGh([(1, "E0: Process foundation", ["epic", "must-have", "E0"]),
                     (2, "PBI-01: GitHub workflow", ["pbi", "must-have", "E0"])])
        run_import(self.items, gh, dry_run=False)
        titles = [t for _, t, _, _ in gh.created]
        self.assertNotIn("E0: Process foundation", titles)
        self.assertNotIn("PBI-01: GitHub workflow", titles)
        self.assertIn("Create labels", titles)
        task_body = next(b for _, t, b, _ in gh.created if t == "Create labels")
        self.assertIn("Parent PBI: #2 (PBI-01)", task_body)

    def test_verify_reports_missing_issue_and_missing_label(self):
        gh = FakeGh([(1, "E0: Process foundation", ["epic", "must-have"])])
        self.assertEqual(run_verify(self.items, gh), 1)

    def test_verify_passes_when_phase_labels_are_absent(self):
        existing = [(n, i.title, [x for x in i.labels if not x.startswith("F")]) for n, i in enumerate(self.items, start=1)]
        gh = FakeGh(existing)
        run_import(self.items, gh, dry_run=False)
        self.assertEqual(run_verify(self.items, gh), 0)

    def test_verify_reports_issues_that_are_not_linked(self):
        gh = FakeGh([(n, i.title, i.labels) for n, i in enumerate(self.items, start=1)])
        self.assertEqual(run_verify(self.items, gh), 1)

    def test_body_formats_match_the_existing_issues(self):
        by_key = {i.key: i for i in self.items}
        body = render_body(by_key["PBI-01/1"], by_key, {"PBI-01": 2})
        self.assertTrue(body.startswith("Parent PBI: #2 (PBI-01)\n\n## Description\nCreate labels\n"))
        self.assertIn("- [ ] CI green", body)


if __name__ == "__main__":
    unittest.main()
