import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCES = [*(ROOT / "apps").glob("*/src/**/*.ts"), *(ROOT / "apps" / "web" / "app").rglob("*.ts*")]
COMPOSE = sorted(ROOT.glob("docker-compose*.yml"))
# Set by the platform or by Compose itself, not by the person who fills in `.env`.
PROVIDED = {"NODE_ENV"}


def listed_in_example():
    """Names in .env.example, including optional ones that are commented out."""
    text = (ROOT / ".env.example").read_text(encoding="utf-8")
    return set(re.findall(r"^#?\s*([A-Z][A-Z0-9_]*)=", text, re.M))


def read_by_the_apps():
    names = set()
    for path in SOURCES:
        if "node_modules" in path.parts or ".next" in path.parts:
            continue
        names |= set(re.findall(r"process\.env\.([A-Z][A-Z0-9_]*)", path.read_text(encoding="utf-8")))
    schema = ROOT / "apps" / "api-tasks" / "prisma" / "schema.prisma"
    names |= set(re.findall(r'env\("([A-Z][A-Z0-9_]*)"\)', schema.read_text(encoding="utf-8")))
    return names - PROVIDED


def read_by_compose():
    return {n for path in COMPOSE for n in re.findall(r"\$\{([A-Z][A-Z0-9_]*)", path.read_text(encoding="utf-8"))}


class EnvExampleTests(unittest.TestCase):
    def test_lists_every_variable_the_apps_read(self):
        self.assertEqual(read_by_the_apps() - listed_in_example(), set())

    def test_lists_every_variable_the_compose_files_read(self):
        self.assertEqual(read_by_compose() - listed_in_example(), set())

    def test_every_listed_variable_is_used_somewhere(self):
        used = read_by_the_apps() | read_by_compose()
        self.assertEqual(listed_in_example() - used, set())

    def test_holds_placeholders_only(self):
        text = (ROOT / ".env.example").read_text(encoding="utf-8")
        for line in text.splitlines():
            if re.match(r"^[A-Z_]*(PASSWORD|PASS|SECRET|TOKEN|KEY)=", line):
                self.assertEqual(line.split("=", 1)[1], "change-me", line)

    def test_compose_requires_the_database_credentials(self):
        text = (ROOT / "docker-compose.infra.yml").read_text(encoding="utf-8")
        for name in ("POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "MONGO_USER", "MONGO_PASSWORD"):
            self.assertIn("${%s:?" % name, text)


if __name__ == "__main__":
    unittest.main()
