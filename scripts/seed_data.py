#!/usr/bin/env python3
"""Loads and validates the fictional store in seed/store.json.

The file is the seed of the demo store: categories, products with stock, and demo users per role.
Loading it into the database waits for the tables it needs (users and roles in PBI-06, the catalog in PBI-07).

  scripts/seed_data.py --check     validate the file, exit 1 if there is any problem
"""
import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

DEFAULT = Path(__file__).resolve().parent.parent / "seed" / "store.json"
ROLES = {"customer", "seller", "admin"}
SAFE_DOMAIN = "@example.com"  # reserved for documentation: it can never reach a real person
MIN_PRODUCTS = 20


def load(path=DEFAULT):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def _duplicates(values):
    return sorted(v for v, n in Counter(values).items() if n > 1)


def validate(data):
    """Returns a list of problems; an empty list means the seed is valid."""
    problems = []
    if data.get("simulated") is not True:
        problems.append('"simulated" must be true')
    categories = [c.get("slug") for c in data.get("categories", [])]
    for slug in _duplicates(categories):
        problems.append(f"duplicate category slug: {slug}")
    products = data.get("products", [])
    if len(products) < MIN_PRODUCTS:
        problems.append(f"needs at least {MIN_PRODUCTS} products, has {len(products)}")
    for field in ("sku", "name"):
        for value in _duplicates(p.get(field) for p in products):
            problems.append(f"duplicate product {field}: {value}")
    for p in products:
        sku = p.get("sku", "?")
        if p.get("category") not in categories:
            problems.append(f"{sku}: unknown category {p.get('category')!r}")
        price = p.get("price_cents")
        if not isinstance(price, int) or isinstance(price, bool) or price <= 0:
            problems.append(f"{sku}: price_cents must be a positive integer")
        stock = p.get("stock")
        if not isinstance(stock, int) or isinstance(stock, bool) or stock < 0:
            problems.append(f"{sku}: stock must be a non-negative integer")
        if not p.get("description") or len(p["description"]) > 200:
            problems.append(f"{sku}: description must have 1 to 200 characters")
        if re.search(r"https?://", p.get("description", "")):
            problems.append(f"{sku}: description must not contain links")
    users = data.get("users", [])
    for email in _duplicates(u.get("email") for u in users):
        problems.append(f"duplicate user e-mail: {email}")
    for u in users:
        if not str(u.get("email", "")).endswith(SAFE_DOMAIN):
            problems.append(f"user {u.get('email')!r}: e-mail must end with {SAFE_DOMAIN}")
        if u.get("role") not in ROLES:
            problems.append(f"user {u.get('email')!r}: unknown role {u.get('role')!r}")
        if "password" in u:
            problems.append(f"user {u.get('email')!r}: passwords do not belong in the seed file")
    for role in sorted(ROLES - {u.get("role") for u in users}):
        problems.append(f"no demo user with the role {role}")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", required=True)
    parser.add_argument("--file", default=str(DEFAULT))
    args = parser.parse_args()
    data = load(args.file)
    problems = validate(data)
    for problem in problems:
        print(f"PROBLEM  {problem}")
    print(f"{len(data.get('categories', []))} categories, {len(data.get('products', []))} products, "
          f"{len(data.get('users', []))} users: {len(problems)} problems")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
