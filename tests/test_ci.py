"""Keeps the CI workflows consistent: every check runs on pull requests, the deploy placeholder stays inert."""
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKFLOWS = ROOT / ".github" / "workflows"
PR_BRANCHES = "branches: [main, staging, 'pbi/**']"


def read(name):
    return (WORKFLOWS / name).read_text(encoding="utf-8")


class CiWorkflowTests(unittest.TestCase):
    def test_every_check_runs_on_pull_requests_into_the_gitflow_branches(self):
        for name in ("commitlint.yml", "scripts-tests.yml", "typescript.yml", "python.yml", "docker.yml"):
            text = read(name)
            self.assertIn("pull_request:", text, name)
            self.assertIn(PR_BRANCHES, text, name)

    def test_typescript_check_lints_tests_and_builds(self):
        self.assertIn("turbo run lint test build", read("typescript.yml"))

    def test_python_check_runs_ruff_and_pytest(self):
        text = read("python.yml")
        self.assertIn("ruff check", text)
        self.assertIn("pytest", text)

    def test_docker_check_builds_without_pushing(self):
        text = read("docker.yml")
        self.assertIn("push: false", text)
        self.assertNotIn("push: true", text)

    def test_deploy_placeholder_uses_no_secrets_and_no_remote_calls(self):
        text = read("deploy.yml")
        self.assertNotIn("secrets.", text)
        self.assertIsNone(re.search(r"\bcurl\b|\bnpx\b|migrate deploy", text))
        self.assertIn("PBI-43", text)

    def test_lint_scripts_do_not_rewrite_files(self):
        import json
        for app in ("web", "bff", "api-tasks"):
            scripts = json.loads((ROOT / "apps" / app / "package.json").read_text(encoding="utf-8"))["scripts"]
            self.assertNotIn("--fix", scripts["lint"], app)
            self.assertIn("--fix", scripts["lint:fix"], app)


if __name__ == "__main__":
    unittest.main()
