# Seed data

`store.json` is the fictional store the demo runs on: **Orbit Supply Co.**, with 6 categories, 24 products with stock and 5 demo users (one admin, one seller, three customers).

Everything in it is **simulated**. Names, products and people are invented, e-mails use the reserved `@example.com` domain, and the file holds no passwords. The sales history used to train the machine learning models is a different thing and is generated in PBI-24.

## Check it

```bash
python3 scripts/seed_data.py --check
```

The check rejects a duplicate SKU, an unknown category, a negative stock, a non-positive price, an e-mail outside `@example.com`, a missing role, a password in the file and links in descriptions. `tests/test_seed.py` runs it in CI.

## Loading it into the database

Not done yet, on purpose. The database has no product table and no roles today: users and roles arrive in PBI-06 and the catalog in PBI-07. Those PBIs add the loader, which must be safe to run twice (no duplicates) and must take the demo users' passwords from the environment, never from this file.
