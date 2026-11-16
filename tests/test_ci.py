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

    def test_api_build_output_stays_flat_so_start_prod_finds_main(self):
        import json
        api = ROOT / "apps" / "api-tasks"
        scripts = json.loads((api / "package.json").read_text(encoding="utf-8"))["scripts"]
        build = json.loads((api / "tsconfig.build.json").read_text(encoding="utf-8"))
        self.assertEqual(scripts["start:prod"], "node dist/main")
        # Any folder compiled next to src/ moves main.js to dist/src/main.js and breaks start:prod.
        self.assertIn("scripts", build["exclude"])

    def test_typescript_check_runs_the_integration_tests_on_a_real_postgres(self):
        text = read("typescript.yml")
        self.assertIn("pgvector/pgvector:pg16", text)
        self.assertIn("prisma migrate deploy", text)
        self.assertIn("test:e2e", text)

    # The QA deploy trigger was removed once by accident (PBI-05) and the QA kept running old
    # images after every merge. These tests exist so that cannot happen silently again.
    def test_qa_redeploy_job_calls_the_three_render_hooks_after_the_migrations(self):
        text = read("publish-images.yml")
        self.assertIn("branches: [staging]", text)
        self.assertRegex(text, r"(?m)^  redeploy:")
        self.assertRegex(text, r"(?ms)^  redeploy:.*?needs: migrate")
        for secret in ("RENDER_QA_API_HOOK", "RENDER_QA_BFF_HOOK", "RENDER_QA_WEB_HOOK"):
            self.assertIn("secrets." + secret, text)
        self.assertIn("curl", text)

    def test_qa_deploy_is_documented_and_the_rule_is_in_the_ai_rules(self):
        self.assertTrue((ROOT / "docs" / "qa-deploy.md").exists())
        self.assertTrue(any((ROOT / "docs" / "adr").glob("ADR-006-*.md")))
        rules = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        self.assertIn("docs/qa-deploy.md", rules)
        self.assertIn("RENDER_QA_", (ROOT / "docs" / "qa-deploy.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
