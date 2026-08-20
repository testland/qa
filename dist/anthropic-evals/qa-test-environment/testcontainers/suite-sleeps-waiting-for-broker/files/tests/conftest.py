import time

import pytest
from testcontainers.kafka import KafkaContainer

STARTUP_SECONDS = 25


@pytest.fixture(scope="session")
def broker():
    container = KafkaContainer("confluentinc/cp-kafka:7.6.0")
    container.start()
    # give the broker time to come up before anyone connects
    time.sleep(STARTUP_SECONDS)
    yield container.get_bootstrap_server()
    container.stop()
