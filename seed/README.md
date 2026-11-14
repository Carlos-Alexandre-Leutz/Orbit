# Seed data

`store.json` is the fictional store the demo runs on: **Orbit Supply Co.**, with 6 categories, 24 products with stock and 5 demo users (one admin, one seller, three customers).

Everything in it is **simulated**. Names, products and people are invented, e-mails use the reserved `@example.com` domain, and the file holds no passwords. The sales history used to train the machine learning models is a different thing and is generated in PBI-24.

## Check it

```bash
python3 scripts/seed_data.py --check
```

The check rejects a duplicate SKU, an unknown category, a negative stock, a non-positive price, an e-mail outside `@example.com`, a missing role, a password in the file and links in descriptions. `tests/test_seed.py` runs it in CI.

## Loading it into the database

The **categories and products** are loaded by `pnpm --filter @orbit/api-tasks seed:catalog` (it reads `DATABASE_URL`, and `SEED_FILE` to use another file). It matches rows by slug or SKU, so running it twice creates nothing twice and restores the seed values.

The **demo users are not loaded**: they have no passwords here, and a password must never be written in this file. Make a seller or admin by registering an account and running `pnpm --filter @orbit/api-tasks set-role <email> <seller|admin>`.
