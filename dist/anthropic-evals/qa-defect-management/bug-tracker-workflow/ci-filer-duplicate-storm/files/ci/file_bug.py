import requests, sys, json

TOKEN = "ghp_9Xk2LqR7vTn4Ba1ZcWm0PdYs5HjUf3Gt8Q"
REPO = "acme/web"
HEADERS = {"Authorization": f"Bearer {TOKEN}",
           "Accept": "application/vnd.github+json"}


def find_existing(title):
    try:
        r = requests.get("https://api.github.com/search/issues",
                         params={"q": f'repo:{REPO} is:open label:ci-failure "{title}"'},
                         headers=HEADERS)
        return r.json().get("items", [])
    except Exception:
        return []


def file_bug(title, body):
    hits = find_existing(title)
    if hits:
        requests.post(
            f"https://api.github.com/repos/{REPO}/issues/{hits[0]['number']}/comments",
            json={"body": body}, headers=HEADERS)
        return hits[0]["number"]
    r = requests.post(f"https://api.github.com/repos/{REPO}/issues",
                      json={"title": title, "body": body,
                            "labels": ["bug", "auto-filed", "ci-failure"]},
                      headers=HEADERS)
    return r.json()["number"]


if __name__ == "__main__":
    failure = json.load(open(sys.argv[1]))
    print(file_bug(f"CI failure: {failure['location']} {failure['assertion']}",
                   failure["message"]))
