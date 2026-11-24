import copy
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from seed_data import load, validate  # noqa: E402


class SeedFileTests(unittest.TestCase):
    def test_the_real_seed_is_valid(self):
        self.assertEqual(validate(load()), [])

    def test_is_marked_as_simulated(self):
        self.assertIs(load()["simulated"], True)

    def test_every_category_has_products_and_every_role_has_a_user(self):
        data = load()
        used = {p["category"] for p in data["products"]}
        self.assertEqual(used, {c["slug"] for c in data["categories"]})
        self.assertEqual({u["role"] for u in data["users"]}, {"customer", "seller", "admin"})

    def test_prices_look_like_a_store_not_like_noise(self):
        prices = [p["price_cents"] for p in load()["products"]]
        self.assertTrue(all(100 <= p <= 100_000 for p in prices))


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.good = load()

    def broken(self, change):
        data = copy.deepcopy(self.good)
        change(data)
        return validate(data)

    def test_rejects_data_not_marked_as_simulated(self):
        self.assertTrue(self.broken(lambda d: d.update(simulated=False)))

    def test_rejects_a_duplicate_sku(self):
        problems = self.broken(lambda d: d["products"][1].update(sku=d["products"][0]["sku"]))
        self.assertTrue(any("duplicate product sku" in p for p in problems))

    def test_rejects_an_unknown_category(self):
        problems = self.broken(lambda d: d["products"][0].update(category="nope"))
        self.assertTrue(any("unknown category" in p for p in problems))

    def test_rejects_negative_stock_and_non_positive_price(self):
        self.assertTrue(any("stock" in p for p in self.broken(lambda d: d["products"][0].update(stock=-1))))
        self.assertTrue(any("price_cents" in p for p in self.broken(lambda d: d["products"][0].update(price_cents=0))))
        self.assertTrue(any("price_cents" in p for p in self.broken(lambda d: d["products"][0].update(price_cents=9.99))))

    def test_rejects_a_real_looking_e_mail(self):
        problems = self.broken(lambda d: d["users"][0].update(email="someone@gmail.com"))
        self.assertTrue(any("@example.com" in p for p in problems))

    def test_rejects_a_missing_role(self):
        problems = self.broken(lambda d: d.update(users=[u for u in d["users"] if u["role"] != "seller"]))
        self.assertTrue(any("seller" in p for p in problems))

    def test_rejects_a_password_in_the_seed(self):
        self.assertTrue(self.broken(lambda d: d["users"][0].update(password="x")))

    def test_rejects_links_in_descriptions(self):
        self.assertTrue(self.broken(lambda d: d["products"][0].update(description="see https://evil.example")))

    def test_rejects_too_few_products(self):
        self.assertTrue(self.broken(lambda d: d.update(products=d["products"][:5])))


if __name__ == "__main__":
    unittest.main()
