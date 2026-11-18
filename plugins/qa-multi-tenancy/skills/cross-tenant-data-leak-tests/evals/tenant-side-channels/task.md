# Find cross-tenant leaks in our API before the pen test

## Problem Description

A pen test of our multi-tenant API is next week. Review `app/routes.py` (plus `docs/storage.md` and `db/schema.sql`) for ways one tenant can learn about or reach another tenant's data, fix them, and write the tests in `tests/test_tenant_isolation.py`.

## Output Specification

Do the task on the files in the working directory, changing them in place and adding a file only where the task needs one.

Then write `ANSWER.md` in the working directory with everything you would tell us in your reply (findings, explanations, the reasons for your changes), followed by the full final content of every file you created or changed, each under a heading with its path. Name any file you deleted.

## Input Files

Extract the following files into the working directory before beginning.

=============== FILE: app/routes.py ===============
from fastapi import APIRouter, Depends, HTTPException
from app.auth import current_user
from app import db, s3, cache

router = APIRouter()

@router.post("/invites")
def invite(body: dict, user=Depends(current_user)):
    if db.fetchone("SELECT 1 FROM users WHERE email = %s", [body["email"]]):
        raise HTTPException(409, "Email already registered")
    db.execute("INSERT INTO users (tenant_id, email) VALUES (%s, %s)", [user.tenant_id, body["email"]])
    return {"ok": True}

@router.get("/files/presign")
def presign(key: str, user=Depends(current_user)):
    return {"url": s3.generate_presigned_url("get_object", Params={"Bucket": "docs", "Key": key}, ExpiresIn=600)}

@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: str, user=Depends(current_user)):
    inv = cache.get_or_set(f"invoice:{invoice_id}", lambda: db.fetchone(
        "SELECT * FROM invoices WHERE id = %s AND tenant_id = %s", [invoice_id, user.tenant_id]))
    if inv is None:
        raise HTTPException(404)
    if inv["tenant_id"] != user.tenant_id:
        raise HTTPException(403)
    return inv

=============== FILE: docs/storage.md ===============
Files are stored under `docs/<tenant_id>/<file_name>` in the `docs` bucket.

=============== FILE: db/schema.sql ===============
CREATE TABLE users (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, email text NOT NULL UNIQUE);
