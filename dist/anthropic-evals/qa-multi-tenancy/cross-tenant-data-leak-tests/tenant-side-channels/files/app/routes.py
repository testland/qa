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
