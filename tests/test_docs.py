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
