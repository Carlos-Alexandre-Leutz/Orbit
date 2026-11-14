import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HAS_COMPOSE = shutil.which("docker") is not None and subprocess.run(
    ["docker", "compose", "version"], capture_output=True).returncode == 0


def compose_config(*files):
    args = ["docker", "compose", "--env-file", ".env.example"]
    for f in files:
        args += ["-f", f]
    out = subprocess.run([*args, "config", "--format", "json"], cwd=ROOT, capture_output=True, text=True)
    if out.returncode:
        raise AssertionError(out.stderr)
    return json.loads(out.stdout)


@unittest.skipUnless(HAS_COMPOSE, "docker compose is not available")
class ComposeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.full = compose_config("docker-compose.yml")["services"]
        cls.dev = compose_config("docker-compose.dev.yml")["services"]

    def test_both_files_define_the_backing_services_and_the_apps(self):
        for services in (self.full, self.dev):
            self.assertEqual({"db", "mongo", "ml", "api-tasks", "bff", "frontend"}, set(services))

    def test_postgres_has_pgvector_and_the_init_script(self):
        db = self.full["db"]
        self.assertIn("pgvector", db["image"])
        self.assertTrue(any(v["target"] == "/docker-entrypoint-initdb.d" for v in db["volumes"]))
        self.assertTrue((ROOT / "infra" / "postgres" / "init" / "01-extensions.sql").read_text().count("vector"))

    def test_databases_are_published_on_loopback_only(self):
        for name in ("db", "mongo"):
            for port in self.full[name]["ports"]:
                self.assertEqual(port["host_ip"], "127.0.0.1", name)

    def test_ml_service_is_not_published_to_the_host(self):
        self.assertNotIn("ports", self.full["ml"])

    def test_every_service_of_the_full_stack_has_a_health_check(self):
        for name in ("db", "mongo", "ml", "api-tasks", "bff", "frontend"):
            self.assertIn("healthcheck", self.full[name], name)

    def test_pnpm_filters_use_the_orbit_package_names(self):
        for services in (self.full, self.dev):
            for name in ("api-tasks", "bff", "frontend"):
                command = " ".join(services[name]["command"])
                self.assertNotRegex(command, r"--filter (api-tasks|bff|web)\b", name)
                self.assertIn("@orbit/", command, name)


if __name__ == "__main__":
    unittest.main()
