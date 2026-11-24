import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEV = ROOT / "scripts" / "dev"


def run(*args, stdin=""):
    return subprocess.run([str(DEV), *args], input=stdin, capture_output=True, text=True, cwd=ROOT)


class DevScriptTests(unittest.TestCase):
    def test_syntax_is_valid(self):
        result = subprocess.run(["bash", "-n", str(DEV)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_is_executable(self):
        self.assertTrue(DEV.stat().st_mode & 0o111)

    def test_help_lists_up_and_the_script_never_removes_containers(self):
        self.assertIn("scripts/dev up", run("help").stdout)
        text = DEV.read_text(encoding="utf-8")
        self.assertNotRegex(text, r"docker compose (down|rm|stop|restart)|docker (rm|stop|kill)")

    def classify(self, *paths):
        result = run("classify", stdin="\n".join(paths) + "\n")
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout.split()

    def test_documentation_only_needs_just_the_script_tests(self):
        self.assertEqual(self.classify("README.md", "index.html", "docs/fluxo-de-trabalho.md"), ["scripts"])

    def test_web_change_needs_only_the_typescript_checks(self):
        self.assertEqual(self.classify("apps/web/app/page.tsx"), ["ts"])

    def test_dependency_files_need_the_typescript_checks_and_the_script_tests(self):
        self.assertEqual(self.classify("pnpm-lock.yaml"), ["ts", "scripts"])

    def test_ml_change_needs_python_only(self):
        self.assertEqual(self.classify("services/ml/app/main.py"), ["python"])

    def test_python_script_change_needs_python_and_the_script_tests(self):
        self.assertEqual(self.classify("scripts/backlog.py"), ["python", "scripts"])

    def test_commitlint_files_need_the_commitlint_tests(self):
        self.assertIn("commitlint", self.classify("commitlint.config.mjs"))

    def test_no_files_need_no_checks(self):
        self.assertEqual(self.classify(), [])

    def test_pr_refuses_a_message_that_is_not_conventional(self):
        result = run("pr", "add the QA link")
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("Conventional Commits", result.stderr)

    def test_never_adds_an_attribution_trailer_or_merges(self):
        text = DEV.read_text(encoding="utf-8")
        self.assertNotIn("Co-authored-by", text)
        self.assertNotIn("/merge", text)
        self.assertNotIn("push -f", text)
        self.assertNotRegex(text, r"--force(?!-recreate)|push[^\n]*\s-f\b")  # --force-recreate (docker) is fine


if __name__ == "__main__":
    unittest.main()
