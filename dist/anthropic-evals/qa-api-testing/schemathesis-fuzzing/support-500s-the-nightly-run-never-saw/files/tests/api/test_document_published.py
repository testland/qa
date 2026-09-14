import pathlib

SPEC = pathlib.Path(__file__).resolve().parents[2] / "openapi.yaml"


def test_every_documented_path_is_versioned():
    lines = SPEC.read_text(encoding="utf-8").splitlines()
    paths = [ln.strip().rstrip(":") for ln in lines if ln.startswith("  /")]
    assert paths, "no paths found in the document"
    assert all(p.startswith("/v1/") for p in paths), paths
