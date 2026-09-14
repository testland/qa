import random

from locust import HttpUser, task

from kestrel_sig import sign

MERCHANTS = [line.strip() for line in open("tests/load/merchants.txt")]


class Scorer(HttpUser):
    @task(3)
    def score(self):
        mid = random.choice(MERCHANTS)
        body = {"merchant": mid, "amount": 4999, "mcc": "5812"}
        self.client.post(
            f"/v1/score/{mid}",
            json=body,
            headers={"X-Kestrel-Signature": sign(mid, body)},
        )

    @task(1)
    def model_version(self):
        self.client.get("/v1/models/current")
