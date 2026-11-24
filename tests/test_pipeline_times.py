import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
from pipeline_times import summarize  # noqa: E402


def run(workflow, start, end, conclusion="success"):
    return {"workflowName": workflow, "conclusion": conclusion,
            "startedAt": f"2026-11-14T10:{start}Z", "updatedAt": f"2026-11-14T10:{end}Z"}


class PipelineTimesTests(unittest.TestCase):
    def test_median_longest_and_failures_per_workflow(self):
        runs = [run("a", "00:00", "00:10"), run("a", "00:00", "00:30"), run("a", "00:00", "01:00", "failure"),
                run("b", "00:00", "00:05")]
        result = summarize(runs)
        self.assertEqual(result["a"], {"runs": 3, "median": 30.0, "longest": 60.0, "failed": 1})
        self.assertEqual(result["b"]["runs"], 1)

    def test_cancelled_and_unfinished_runs_are_left_out(self):
        runs = [run("a", "00:00", "00:10"), run("a", "00:00", "05:00", "cancelled"), run("a", "00:00", "00:20", "")]
        self.assertEqual(summarize(runs)["a"]["runs"], 1)

    def test_no_runs_gives_nothing(self):
        self.assertEqual(summarize([]), {})


if __name__ == "__main__":
    unittest.main()
