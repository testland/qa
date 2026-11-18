import json, sys

results = json.load(open("target/run_results.json"))["results"]
broken = [r["unique_id"] for r in results if r["status"] == "error"]
if broken:
    print("dbt errors:", broken)
    sys.exit(1)
print("dbt OK")
