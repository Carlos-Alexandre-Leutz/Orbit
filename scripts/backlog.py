"""Parses docs/00-backlog.md into epics, PBIs and tasks, and renders their GitHub issues."""
import re
from dataclasses import dataclass, field

EPIC_RE = re.compile(r"^## (E\d+)\. (.+?)(?: \[(must|cut)\])?\s*$")
PBI_RE = re.compile(r"^### (PBI-\d+) \[(F\d)\] (.+?)(?: \[(must|cut)\])?\s*$")
TASK_RE = re.compile(r"^- T: (\[cut\] )?(.+?)\s*$")

PRIORITY = {"must": "must-have", "cut": "cuttable"}

PBI_COMPLETION = (
    "On completion run the tests, validate every acceptance criterion, write "
    "`docs/pbi/{key}.md` and open the PR from `pbi/` into `staging`."
)


@dataclass
class Item:
    kind: str  # epic | pbi | task
    key: str  # E0, PBI-01 or PBI-01/3 (task index inside its PBI)
    title: str
    labels: list
    parent: str = ""
    name: str = ""
    children: list = field(default_factory=list)


def _labels(*labels):
    return [label for label in labels if label]


def parse_backlog(text):
    """Returns the items in document order: each epic, then its PBIs, then their tasks."""
    items, epic, pbi = [], None, None
    for line in text.splitlines():
        if m := EPIC_RE.match(line):
            epic_key, name, marker = m.groups()
            priority = PRIORITY.get(marker)  # no marker means no priority label
            epic = Item("epic", epic_key, f"{epic_key}: {name}", _labels("epic", priority, epic_key), name=name)
            epic.priority = priority
            items.append(epic)
            pbi = None
        elif m := PBI_RE.match(line):
            key, phase, name, marker = m.groups()
            priority = PRIORITY[marker] if marker else epic.priority
            pbi = Item("pbi", key, f"{key}: {name}", _labels("pbi", priority, epic.key, phase), parent=epic.key, name=name)
            pbi.priority, pbi.phase = priority, phase
            epic.children.append(pbi.key)
            items.append(pbi)
        elif (m := TASK_RE.match(line)) and pbi is not None:
            cut, name = m.groups()
            priority = "cuttable" if cut else pbi.priority
            index = len(pbi.children) + 1
            task = Item("task", f"{pbi.key}/{index}", f"[{pbi.key}] {name}",
                        _labels("task", priority, epic.key, pbi.phase), parent=pbi.key, name=name)
            pbi.children.append(task.key)
            items.append(task)
    return items


def render_body(item, by_key, numbers):
    """Renders the issue body. `numbers` maps item keys to issue numbers."""
    parent = by_key.get(item.parent)
    if item.kind == "epic":
        lines = [f"- [ ] #{numbers[k]} {by_key[k].title}" for k in item.children if k in numbers]
        return "## Epic\n" + item.name + "\n\n## PBIs\n" + "\n".join(lines) + "\n"
    if item.kind == "pbi":
        lines = [f"- [ ] #{numbers[k]} {by_key[k].name}" for k in item.children if k in numbers]
        return (
            f"Parent epic: #{numbers[parent.key]} ({parent.key})\n\n## Goal\n{item.name}\n\n"
            "## Acceptance criteria\n_To be refined before this PBI starts._\n\n"
            "## Tasks\n" + "\n".join(lines) + "\n\n## Completion\n" + PBI_COMPLETION.format(key=item.key) + "\n"
        )
    return (
        f"Parent PBI: #{numbers[parent.key]} ({parent.key})\n\n## Description\n{item.name}\n\n"
        "## Definition of Done\n- [ ] Code and tests\n- [ ] PR documents what was done and how it was tested\n"
        "- [ ] AI usage declared in the PR\n- [ ] CI green\n"
    )
