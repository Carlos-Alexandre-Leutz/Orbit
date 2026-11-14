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


class SetupDocTests(unittest.TestCase):
    def setUp(self):
        self.text = (ROOT / "docs" / "setup.md").read_text(encoding="utf-8")

    def test_names_every_compose_service(self):
        services = set()
        for name in ("docker-compose.yml", "docker-compose.infra.yml"):
            body = (ROOT / name).read_text(encoding="utf-8").split("\nvolumes:")[0]
            services |= set(re.findall(r"^  ([a-z][a-z-]*):\s*$", body, re.M))
        self.assertGreaterEqual(len(services), 6)
        for service in services:
            self.assertIn(f"`{service}`", self.text)

    def test_the_one_command_is_the_one_in_the_readme(self):
        command = "docker compose up -d --build --wait"
        self.assertIn(command, self.text)
        self.assertIn(command, (ROOT / "README.md").read_text(encoding="utf-8"))

    def test_every_variable_it_names_is_in_env_example(self):
        example = (ROOT / ".env.example").read_text(encoding="utf-8")
        for name in set(re.findall(r"`([A-Z][A-Z0-9_]{3,})`", self.text)):
            if name.startswith(("POSTGRES_", "MONGO_")):
                self.assertIn(name + "=", example)


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


class WorkingAgreementTests(unittest.TestCase):
    """The rule that decisions live in the repository, and the documents that carry them."""

    def read(self, name):
        return (ROOT / "docs" / name).read_text(encoding="utf-8")

    def test_agents_md_states_the_rule_and_links_the_agreement(self):
        text = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("Decisions live in the repository, not in the chat", text)
        self.assertIn("docs/working-agreement.md", text)
        self.assertIn("docs/project-state.md", text)

    def test_the_agreement_names_where_everything_goes(self):
        text = self.read("working-agreement.md")
        for target in ("adr/", "00-backlog.md", "open-questions.md", "project-state.md", "ideas/", "../AGENTS.md"):
            self.assertIn(target, text)

    def test_project_state_has_its_sections_and_a_date(self):
        text = self.read("project-state.md")
        for heading in ("## Where it stands", "## Next step", "## Environment traps", "## Known risks"):
            self.assertIn(heading, text)
        self.assertRegex(text, r"\*\*Last updated: \d{4}-\d{2}-\d{2}\.\*\*")

    def test_every_pbi_the_state_and_questions_name_exists_in_the_backlog(self):
        backlog = (ROOT / "docs" / "00-backlog.md").read_text(encoding="utf-8")
        known = set(re.findall(r"^### (PBI-\d+)", backlog, re.M))
        for name in ("project-state.md", "open-questions.md"):
            named = set(re.findall(r"PBI-\d+", self.read(name)))
            self.assertEqual(named - known, set(), name)

    def test_open_questions_separates_decisions_from_owner_only_actions(self):
        text = self.read("open-questions.md")
        self.assertIn("## Decisions", text)
        self.assertIn("## Only the owner can do these", text)


if __name__ == "__main__":
    unittest.main()
