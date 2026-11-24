from app.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_health_reports_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ml"}


def test_has_no_other_endpoint_yet():
    docs = ("/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc")
    paths = {route.path for route in app.routes if route.path not in docs}
    assert paths == {"/health"}
