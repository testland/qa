from locust import HttpUser, task, constant

TOKEN = "eyJhbGciOiJIUzI1NiJ9.loadtest-shared-account.9f2a1c"


class Shopper(HttpUser):
    wait_time = constant(0)

    @task
    def product_page(self):
        self.client.get(
            "/api/products/4471",
            headers={"Authorization": f"Bearer {TOKEN}"},
        )
