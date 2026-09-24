import requests


def test_server_answers(idp):
    """Smoke check: the container is up and serving."""
    response = requests.get(idp.get_url(), timeout=30)
    assert response.status_code == 200
