import ldclient
from ldclient.config import Config
from ldclient.integrations.test_data import TestData

from flag_states import BOOLEAN_STATES, MULTI_STATES
from pricing_flags import seat_tier, price_book

td = TestData.data_source()
ldclient.set_config(Config("sdk-test-key", update_processor_class=td, send_events=False))
client = ldclient.get()


def install_boolean(key):
    s = BOOLEAN_STATES[key]
    f = td.flag(key).boolean_flag().on(s["on"]).fallthrough_variation(0 if s["fallthrough"] else 1)
    for ctx, value in s["targeted"].items():
        f = f.variation_for_user(ctx, 0 if value else 1)
    td.update(f)


def install_multi(key):
    s = MULTI_STATES[key]
    f = td.flag(key).variations(*s["variations"]).on(s["on"])
    f = f.fallthrough_variation(s["variations"].index(s["fallthrough"]))
    for ctx, value in s["targeted"].items():
        f = f.variation_for_user(ctx, s["variations"].index(value))
    td.update(f)


def test_enterprise_account_gets_the_bulk_seat_price():
    install_boolean("seat-tier-v2")
    install_boolean("bulk-seat-discount")
    assert seat_tier(client, {"key": "acct-ent-1"}) == "v2-bulk"


def test_german_account_gets_the_eu_price_book():
    install_multi("price-book-region")
    assert price_book(client, {"key": "acct-de-9"}) == "eu"
