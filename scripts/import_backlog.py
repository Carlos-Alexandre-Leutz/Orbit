#!/usr/bin/env python3
"""Imports docs/00-backlog.md as GitHub issues (epic -> PBI -> task). Safe to run again.

An item is skipped when an issue with the same title already exists, so running it
against a repository that already holds the backlog creates nothing.

  scripts/import_backlog.py --dry-run     show what would be created, change nothing
  scripts/import_backlog.py --verify      compare the backlog with the existing issues
  scripts/import_backlog.py               create the missing issues
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from backlog import parse_backlog, render_body  # noqa: E402

PHASE_LABELS = {"F1", "F2", "F3", "F4"}


class GhCli:
    """Thin wrapper over the gh CLI, so tests can replace it."""

    def __init__(self, repo=None):
        self.repo = ["--repo", repo] if repo else []

    def _run(self, *args):
        return subprocess.run(["gh", *args], check=True, capture_output=True, text=True).stdout.strip()

    def list_issues(self):
        out = self._run("issue", "list", "--state", "all", "--limit", "2000", "--json", "number,title,labels", *self.repo)
        return json.loads(out)

    def create_issue(self, title, body, labels):
        args = ["issue", "create", "--title", title, "--body", body, *self.repo]
        for label in labels:
            args += ["--label", label]
        return int(self._run(*args).rsplit("/", 1)[1])

    def edit_issue(self, number, body):
        self._run("issue", "edit", str(number), "--body", body, *self.repo)


def plan(items, existing):
    """Returns (numbers of existing items by key, items still to create)."""
    by_title = {issue["title"]: issue["number"] for issue in existing}
    numbers = {i.key: by_title[i.title] for i in items if i.title in by_title}
    return numbers, [i for i in items if i.key not in numbers]


def run_import(items, gh, dry_run):
    by_key = {i.key: i for i in items}
    numbers, missing = plan(items, gh.list_issues())
    print(f"backlog: {sum(i.kind == 'epic' for i in items)} epics, {sum(i.kind == 'pbi' for i in items)} PBIs, "
          f"{sum(i.kind == 'task' for i in items)} tasks; already on GitHub: {len(numbers)}; to create: {len(missing)}")
    for item in missing:
        print(f"  would create {item.kind}: {item.title}" if dry_run else f"  creating {item.kind}: {item.title}")
    if dry_run or not missing:
        return 0
    for item in missing:  # parents come before children in document order
        numbers[item.key] = gh.create_issue(item.title, render_body(item, by_key, numbers), item.labels)
    for parent in (i for i in missing if i.kind in ("epic", "pbi")):  # now every child number is known
        gh.edit_issue(numbers[parent.key], render_body(parent, by_key, numbers))
    print(f"created {len(missing)} issues")
    return 0


def run_verify(items, gh):
    """Reports items whose issue is missing or whose labels differ (phase labels are ignored)."""
    by_title = {issue["title"]: issue for issue in gh.list_issues()}
    problems = 0
    for item in items:
        issue = by_title.get(item.title)
        if issue is None:
            print(f"MISSING  {item.title}")
            problems += 1
            continue
        have = {label["name"] for label in issue["labels"]} - PHASE_LABELS
        want = set(item.labels) - PHASE_LABELS
        if not want <= have:
            print(f"LABELS   #{issue['number']} {item.title}: missing {sorted(want - have)}")
            problems += 1
    print(f"verified {len(items)} items, {problems} problems")
    return 1 if problems else 0


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--backlog", default="docs/00-backlog.md")
    parser.add_argument("--repo", help="owner/repo (defaults to the current repository)")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--verify", action="store_true")
    args = parser.parse_args()
    items = parse_backlog(Path(args.backlog).read_text(encoding="utf-8"))
    gh = GhCli(args.repo)
    return run_verify(items, gh) if args.verify else run_import(items, gh, args.dry_run)


if __name__ == "__main__":
    sys.exit(main())
