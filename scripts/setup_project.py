#!/usr/bin/env python3
"""Sets up the GitHub Project of the backlog: Phase and Priority fields, their values, and views.

Phase and Priority come from docs/00-backlog.md (same parser as the issue import). Safe to run again:
existing fields and views are kept, and values are simply set to the same result.

  scripts/setup_project.py --owner <login> --project <number> [--dry-run]
"""
import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from backlog import parse_backlog  # noqa: E402

FIELDS = {"Phase": ["F1", "F2", "F3", "F4"], "Priority": ["must-have", "cuttable"]}
VIEWS = [  # name, layout, filter
    ("Backlog", "table", None),
    ("Board", "board", None),
    ("Must-have", "table", "priority:must-have"),
]
BATCH = 10


def gh(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode:
        raise SystemExit(f"gh {' '.join(args[:3])} failed: {result.stderr.strip() or result.stdout.strip()}"[:600])
    return result.stdout


def build_updates(items, project_items, fields):
    """Returns (item_id, field_id, option_id) for every Phase and Priority value that applies."""
    ids = {i["title"]: i["id"] for i in project_items}
    updates = []
    for item in items:
        item_id = ids.get(item.title)
        if item_id is None:
            continue
        for field, allowed in FIELDS.items():
            label = next((x for x in item.labels if x in allowed), None)  # phase and priority are labels
            option = fields.get(field, {}).get("options", {}).get(label) if label else None
            if option:
                updates.append((item_id, fields[field]["id"], option))
    return updates


def mutation(project_id, updates):
    parts = [
        f'u{n}: updateProjectV2ItemFieldValue(input: {{projectId: "{project_id}", itemId: "{item}", '
        f'fieldId: "{field}", value: {{singleSelectOptionId: "{option}"}}}}) {{ projectV2Item {{ id }} }}'
        for n, (item, field, option) in enumerate(updates)
    ]
    return "mutation { " + " ".join(parts) + " }"


def read_fields(owner, project):
    data = json.loads(gh("project", "field-list", str(project), "--owner", owner, "--format", "json"))
    return {f["name"]: {"id": f["id"], "options": {o["name"]: o["id"] for o in f.get("options", [])}}
            for f in data["fields"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--owner", required=True)
    parser.add_argument("--project", required=True, type=int)
    parser.add_argument("--backlog", default="docs/00-backlog.md")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    items = parse_backlog(Path(args.backlog).read_text(encoding="utf-8"))
    project, owner = str(args.project), args.owner

    fields = read_fields(owner, project)
    for name, options in FIELDS.items():
        if name not in fields:
            print(f"{'would create' if args.dry_run else 'creating'} field {name}")
            if not args.dry_run:
                gh("project", "field-create", project, "--owner", owner, "--name", name,
                   "--data-type", "SINGLE_SELECT", "--single-select-options", ",".join(options))
    if not args.dry_run:
        fields = read_fields(owner, project)

    project_items = [{"id": i["id"], "title": i["content"]["title"]} for i in json.loads(
        gh("project", "item-list", project, "--owner", owner, "--limit", "1000", "--format", "json"))["items"]
        if i.get("content", {}).get("title")]
    updates = build_updates(items, project_items, fields) if not args.dry_run or "Phase" in fields else []
    print(f"{len(project_items)} project items, {len(updates)} values to set")

    query = "query($o: String!, $n: Int!) { user(login: $o) { projectV2(number: $n) { views(first: 50) { nodes { name } } } } }"
    views = json.loads(gh("api", "graphql", "-f", f"query={query}", "-f", f"o={owner}", "-F", f"n={project}"))
    existing_views = {v["name"] for v in views["data"]["user"]["projectV2"]["views"]["nodes"]}
    for name, layout, flt in VIEWS:
        if name in existing_views:
            continue
        print(f"{'would create' if args.dry_run else 'creating'} view {name} ({layout})")
        if not args.dry_run:
            cmd = ["api", "-X", "POST", f"/users/{owner}/projectsV2/{project}/views", "-f", f"name={name}", "-f", f"layout={layout}"]
            gh(*cmd, *(["-f", f"filter={flt}"] if flt else []))

    if args.dry_run or not updates:
        return 0
    project_id = json.loads(gh("project", "view", project, "--owner", owner, "--format", "json"))["id"]
    for start in range(0, len(updates), BATCH):
        query = "query=" + mutation(project_id, updates[start:start + BATCH])
        for attempt in range(4):  # GitHub answers 502 now and then; setting a value twice is harmless
            try:
                gh("api", "graphql", "-f", query)
                break
            except SystemExit:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
    print(f"set {len(updates)} field values")
    return 0


if __name__ == "__main__":
    sys.exit(main())
