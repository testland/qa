import random

from locust import HttpUser, task, between

PRODUCT_IDS = [line.strip() for line in open("load/product-ids.txt")]
ACCOUNTS = [line.strip() for line in open("load/accounts.txt")]


class Shopper(HttpUser):
    wait_time = between(2, 5)

    def on_start(self):
        self.token = random.choice(ACCOUNTS)

    @task
    def product_page(self):
        pid = random.choice(PRODUCT_IDS)
        self.client.get(
            f"/api/products/{pid}",
            name="/api/products/[id]",
            headers={"Authorization": f"Bearer {self.token}"},
        )
