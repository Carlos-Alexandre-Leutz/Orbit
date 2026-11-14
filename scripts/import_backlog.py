#!/usr/bin/env python3
"""Imports docs/00-backlog.md as GitHub issues (epic -> PBI -> task). Safe to run again.

An item is skipped when an issue with the same title already exists, so running it
against a repository that already holds the backlog creates nothing. Every PBI is linked
to its epic and every task to its PBI as a native GitHub sub-issue, so GitHub shows the
hierarchy and task progress; missing links are added on every run.

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
        self._slug = repo

    @property
    def slug(self):
        if not self._slug:
            self._slug = self._run("repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner")
        return self._slug

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

    def list_sub_issues(self, number):
        out = self._run("api", "--paginate", f"repos/{self.slug}/issues/{number}/sub_issues", "--jq", ".[].number")
        return {int(n) for n in out.split()}

    def add_sub_issue(self, parent, child):
        child_id = self._run("api", f"repos/{self.slug}/issues/{child}", "--jq", ".id")  # the API wants the id, not the number
        self._run("api", "-X", "POST", f"repos/{self.slug}/issues/{parent}/sub_issues", "-F", f"sub_issue_id={child_id}")


def plan(items, existing):
    """Returns (numbers of existing items by key, items still to create)."""
    by_title = {issue["title"]: issue["number"] for issue in existing}
    numbers = {i.key: by_title[i.title] for i in items if i.title in by_title}
    return numbers, [i for i in items if i.key not in numbers]


def missing_links(items, numbers, gh):
    """Returns (parent number, child number) for every child that is not yet a sub-issue of its parent."""
    missing = []
    for parent in (i for i in items if i.children and i.key in numbers):
        linked = gh.list_sub_issues(numbers[parent.key])
        missing += [(numbers[parent.key], numbers[c]) for c in parent.children if c in numbers and numbers[c] not in linked]
    return missing


def run_import(items, gh, dry_run):
    by_key = {i.key: i for i in items}
    numbers, missing = plan(items, gh.list_issues())
    print(f"backlog: {sum(i.kind == 'epic' for i in items)} epics, {sum(i.kind == 'pbi' for i in items)} PBIs, "
          f"{sum(i.kind == 'task' for i in items)} tasks; already on GitHub: {len(numbers)}; to create: {len(missing)}")
    for item in missing:
        print(f"  would create {item.kind}: {item.title}" if dry_run else f"  creating {item.kind}: {item.title}")
    if not dry_run:
        for item in missing:  # parents come before children in document order
            numbers[item.key] = gh.create_issue(item.title, render_body(item, by_key, numbers), item.labels)
        for parent in (i for i in missing if i.kind in ("epic", "pbi")):  # now every child number is known
            gh.edit_issue(numbers[parent.key], render_body(parent, by_key, numbers))
        print(f"created {len(missing)} issues")
    links = missing_links(items, numbers, gh)
    print(f"sub-issue links to add: {len(links)}")
    if not dry_run:
        for parent, child in links:
            gh.add_sub_issue(parent, child)
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
    numbers = {i.key: by_title[i.title]["number"] for i in items if i.title in by_title}
    for parent, child in missing_links(items, numbers, gh):
        print(f"NOT LINKED  #{child} is not a sub-issue of #{parent}")
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
