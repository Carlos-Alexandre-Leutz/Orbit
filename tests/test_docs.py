import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKLOG = ROOT / "docs" / "00-backlog.md"
REQUIREMENTS = ROOT / "docs" / "01-requirements.md"

LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)\)")
STORY_RE = re.compile(r"^#### (US-\d+) ", re.M)


def markdown_files():
    top = [p for p in ROOT.glob("*.md")]
    return top + sorted((ROOT / "docs").rglob("*.md"))


def backlog_pbis():
    return set(re.findall(r"^### (PBI-\d+) ", BACKLOG.read_text(encoding="utf-8"), re.M))


def stories():
    """Returns {story id: text of the story}."""
    text = REQUIREMENTS.read_text(encoding="utf-8")
    parts = re.split(r"^(?=#### US-\d+ )", text, flags=re.M)[1:]
    return {STORY_RE.match(p).group(1): re.split(r"^## ", p, flags=re.M)[0] for p in parts}


class LinkTests(unittest.TestCase):
    def test_relative_links_resolve(self):
        broken = []
        for path in markdown_files():
            for target in LINK_RE.findall(path.read_text(encoding="utf-8")):
                if re.match(r"^(https?:|mailto:|#)", target):
                    continue
                if not (path.parent / target.split("#")[0]).exists():
                    broken.append(f"{path.relative_to(ROOT)} -> {target}")
        self.assertEqual(broken, [])


class AiRulesTests(unittest.TestCase):
    def setUp(self):
        self.agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        self.claude = (ROOT / "CLAUDE.md").read_text(encoding="utf-8")
        self.contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")

    def test_claude_md_imports_agents_md_instead_of_copying_it(self):
        self.assertIn("@AGENTS.md", self.claude)
        self.assertLess(len(self.claude.splitlines()), 15)

    def test_required_checks_match_the_protection_script(self):
        script = (ROOT / "scripts" / "protect-branches.sh").read_text(encoding="utf-8")
        checks = re.search(r"CHECKS='\[(.*?)\]'", script).group(1).replace('"', "").split(",")
        self.assertGreater(len(checks), 0)
        for check in checks:
            self.assertIn(f"`{check}`", self.agents)
            self.assertIn(f"`{check}`", self.contributing)

    def test_both_files_state_the_core_rules(self):
        for text in (self.agents, self.contributing):
            self.assertIn("Co-authored-by", text)
            self.assertIn("English", text)
            self.assertIn("task/*", text)
            self.assertIn("Conventional Commits", text)

    def test_agents_md_has_the_main_sections(self):
        for heading in ("## Language", "## Workflow", "## Commits and PRs", "## Engineering rules", "## Local environment"):
            self.assertIn(heading, self.agents)


ADR_DIR = ROOT / "docs" / "adr"
ADR_HEADINGS = ("## Context", "## Decision", "## Alternatives considered", "## Consequences")
ADR_STATUS_RE = re.compile(r"^- \*\*Status:\*\* (Proposed|Accepted|Superseded by ADR-\d{3})$", re.M)


def adrs():
    return sorted(ADR_DIR.glob("ADR-[0-9][0-9][0-9]-*.md"))


class AdrTests(unittest.TestCase):
    def test_template_has_every_section(self):
        template = (ADR_DIR / "template.md").read_text(encoding="utf-8")
        for heading in ADR_HEADINGS:
            self.assertIn(heading, template)

    def test_the_first_two_decisions_exist(self):
        names = [p.name for p in adrs()]
        self.assertTrue(any(n.startswith("ADR-001-") for n in names))
        self.assertTrue(any(n.startswith("ADR-002-") for n in names))

    def test_numbers_are_unique_and_without_gaps(self):
        numbers = [int(p.name[4:7]) for p in adrs()]
        self.assertEqual(numbers, list(range(1, len(numbers) + 1)))

    def test_each_adr_has_title_status_date_and_every_section(self):
        for path in adrs():
            text = path.read_text(encoding="utf-8")
            number = path.name[4:7]
            self.assertRegex(text, re.compile(rf"^# ADR-{number}: .+", re.M), path.name)
            self.assertRegex(text, ADR_STATUS_RE, path.name)
            self.assertRegex(text, re.compile(r"^- \*\*Date:\*\* \d{4}-\d{2}-\d{2}$", re.M), path.name)
            for heading in ADR_HEADINGS:
                self.assertIn(heading, text, f"{path.name}: {heading}")

    def test_every_pbi_an_adr_names_exists_in_the_backlog(self):
        for path in adrs():
            named = set(re.findall(r"PBI-\d+", path.read_text(encoding="utf-8")))
            self.assertEqual(named - backlog_pbis(), set(), path.name)


AI_DOC = ROOT / "docs" / "ai-assisted-development.md"
PATH_RE = re.compile(r"`((?:scripts|tests|docs|\.github)/[\w./-]+|[\w.-]+\.(?:mjs|md))`")


class AiAssistedDevelopmentTests(unittest.TestCase):
    def setUp(self):
        self.text = AI_DOC.read_text(encoding="utf-8")

    def test_has_the_main_sections(self):
        for heading in ("## Who decides what", "## The workflow", "## Guardrails that are enforced, not just written",
                        "## Mistakes made so far, and how they were caught", "## What is not claimed"):
            self.assertIn(heading, self.text)

    def test_says_it_is_a_draft_until_it_is_finished(self):
        self.assertIn("**Status: draft.**", self.text)

    def test_every_file_it_names_exists(self):
        named = [t for t in PATH_RE.findall(self.text) if "nn" not in t]  # "nn" marks a pattern such as PBI-nn.md
        missing = [t for t in named if not (ROOT / t).exists() and not (AI_DOC.parent / t).exists()]
        self.assertEqual(missing, [])

    def test_names_the_guardrail_files(self):
        found = set(PATH_RE.findall(self.text))
        for expected in ("scripts/protect-branches.sh", "commitlint.config.mjs", "tests/test_docs.py"):
            self.assertIn(expected, found)


class RequirementsTests(unittest.TestCase):
    def setUp(self):
        self.text = REQUIREMENTS.read_text(encoding="utf-8")
        self.stories = stories()

    def test_has_the_required_sections(self):
        for heading in ("## Problem", "## Personas", "## User stories", "## Non-functional requirements", "## Out of scope"):
            self.assertIn(heading, self.text)

    def test_names_the_three_roles(self):
        personas = self.text.split("## Personas")[1].split("## User stories")[0]
        for persona in ("**Customer**", "**Seller**", "**Admin**"):
            self.assertIn(persona, personas)

    def test_every_story_has_criteria_and_a_pbi(self):
        self.assertGreater(len(self.stories), 0)
        for key, story in self.stories.items():
            self.assertIn("Acceptance criteria:", story, key)
            self.assertRegex(story, r"Delivered by: PBI-\d+", key)
            self.assertRegex(story, r"As an? .+, I want .+, so that ", key)

    def test_story_ids_are_unique(self):
        ids = STORY_RE.findall(self.text)
        self.assertEqual(len(ids), len(set(ids)))

    def test_every_pbi_named_exists_in_the_backlog(self):
        named = set(re.findall(r"PBI-\d+", " ".join(re.findall(r"Delivered by: .*", self.text))))
        self.assertEqual(named - backlog_pbis(), set())


if __name__ == "__main__":
    unittest.main()
