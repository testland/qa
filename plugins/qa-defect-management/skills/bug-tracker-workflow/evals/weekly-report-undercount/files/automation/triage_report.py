import requests, os, base64

PAT = os.environ["ADO_PAT"]
AUTH = base64.b64encode(f":{PAT}".encode()).decode()
BASE = "https://dev.azure.com/acme/Payments"
H = {"Authorization": f"Basic {AUTH}", "Content-Type": "application/json"}
AREA = "Payments' EU"


def wiql(query, top=50):
    r = requests.post(f"{BASE}/_apis/wit/wiql?$top={top}&api-version=7.1",
                      json={"query": query}, headers=H)
    if r.status_code != 200:
        return []
    return r.json().get("workItems", [])


def open_bugs():
    return wiql("SELECT [System.Id] FROM WorkItems "
                "WHERE [System.WorkItemType] = 'Bug' "
                "AND [System.State] NOT IN ('Resolved', 'Closed') "
                f"AND [System.AreaPath] = '{AREA}'")


def p1_open():
    return [i for i in open_bugs() if field(i["id"], "Microsoft.VSTS.Common.Priority") == 1]


def field(work_item_id, name):
    r = requests.get(f"https://dev.azure.com/acme/_apis/wit/workitems/{work_item_id}"
                     f"?$expand=all&api-version=7.1", headers=H)
    if r.status_code != 200:
        return None
    return r.json()["fields"].get(name)


if __name__ == "__main__":
    opened = open_bugs()
    print(f"- Open bugs: {len(opened)}")
    print(f"- Top urgency (P1) open: {len(p1_open())}")
