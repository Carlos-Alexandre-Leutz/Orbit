from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_reports_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "ml"}


def test_has_no_other_endpoint_yet():
    paths = {route.path for route in app.routes if route.path not in ("/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc")}
    assert paths == {"/health"}
