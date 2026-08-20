async def test_seed_row_is_present(pool):
    assert await pool.execute("seed") == "ok"


async def test_write_then_read(pool):
    await pool.execute("a", "1")
    assert await pool.execute("a") == "1"


async def test_missing_key_is_none(pool):
    assert await pool.execute("nope") is None
