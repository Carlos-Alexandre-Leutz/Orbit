#!/usr/bin/env python3
"""Reports how long each CI workflow takes, from the latest runs on GitHub.

  scripts/pipeline_times.py [--limit 50]

Only completed runs count. Time is wall-clock from start to last update, so it includes
queueing inside the run. Cancelled runs are left out.
"""
import argparse
import json
import statistics
import subprocess
from datetime import datetime


def seconds(run):
    start = datetime.fromisoformat(run["startedAt"].replace("Z", "+00:00"))
    end = datetime.fromisoformat(run["updatedAt"].replace("Z", "+00:00"))
    return (end - start).total_seconds()


def summarize(runs):
    """Returns {workflow: {runs, median, longest, failed}} for completed, non-cancelled runs."""
    by_workflow = {}
    for run in runs:
        if run.get("conclusion") in (None, "", "cancelled", "skipped"):
            continue
        by_workflow.setdefault(run["workflowName"], []).append(run)
    return {
        name: {
            "runs": len(items),
            "median": statistics.median(seconds(r) for r in items),
            "longest": max(seconds(r) for r in items),
            "failed": sum(r["conclusion"] != "success" for r in items),
        }
        for name, items in sorted(by_workflow.items())
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()
    out = subprocess.run(
        ["gh", "run", "list", "--limit", str(args.limit), "--json", "workflowName,conclusion,startedAt,updatedAt"],
        capture_output=True, text=True, check=True,
    ).stdout
    summary = summarize(json.loads(out))
    print(f"{'workflow':<16}{'runs':>5}{'median s':>10}{'longest s':>11}{'failed':>8}")
    for name, s in summary.items():
        print(f"{name:<16}{s['runs']:>5}{s['median']:>10.0f}{s['longest']:>11.0f}{s['failed']:>8}")


if __name__ == "__main__":
    main()
