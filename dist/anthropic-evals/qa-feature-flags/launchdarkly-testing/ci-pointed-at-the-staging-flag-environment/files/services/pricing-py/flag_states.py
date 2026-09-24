# Flag states the Python suite asserts against.
# Keep in step with test/support/flag-states.js by hand.

BOOLEAN_STATES = {
    "seat-tier-v2": {"on": True, "fallthrough": True, "targeted": {}},
    "bulk-seat-discount": {"on": True, "fallthrough": False, "targeted": {"acct-ent-1": True}},
}

MULTI_STATES = {
    "price-book-region": {
        "on": True,
        "variations": ["global", "eu", "apac"],
        "fallthrough": "global",
        "targeted": {"acct-de-9": "eu"},
    },
}
