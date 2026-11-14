"""Placeholder for Orbit's machine learning service (see docs/adr/ADR-002-ml-separate-python-service.md).

It only answers a health check. The models and prediction endpoints arrive in PBI-27.
"""
from fastapi import FastAPI

app = FastAPI(title="Orbit ML service")


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml"}
