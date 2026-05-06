from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form, Query
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import io
import csv
import uuid
import shutil
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

from pydantic import BaseModel, Field, ConfigDict
import pandas as pd

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ---- Models ----
class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item_name: str
    clean_item_name: Optional[str] = ""
    category: Optional[str] = ""
    description: Optional[str] = ""
    price: Optional[float] = 0
    pack_qty: Optional[int] = None
    pack_unit: Optional[str] = ""
    image: Optional[str] = ""
    status: Optional[str] = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductCreate(BaseModel):
    item_name: str
    clean_item_name: Optional[str] = ""
    category: Optional[str] = ""
    description: Optional[str] = ""
    price: Optional[float] = 0
    pack_qty: Optional[int] = None
    pack_unit: Optional[str] = ""
    image: Optional[str] = ""
    status: Optional[str] = "active"

class ProductUpdate(BaseModel):
    item_name: Optional[str] = None
    clean_item_name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    pack_qty: Optional[int] = None
    pack_unit: Optional[str] = None
    image: Optional[str] = None
    status: Optional[str] = None

class ParseRequest(BaseModel):
    item_name: str

class AssignImage(BaseModel):
    image: str

# ---- Pack info parser ----
UNIT_WORDS = [
    "pcs", "piece", "pieces", "pc",
    "pkt", "pkts", "packet", "packets", "pack", "packs",
    "roll", "rolls",
    "box", "boxes",
    "set", "sets",
    "nos", "no",
    "kg", "g", "gm", "gms", "mg",
    "ml", "l", "ltr", "ltrs", "liter", "liters",
    "dozen", "dz",
    "bottle", "bottles",
    "bag", "bags",
    "carton", "cartons",
    "case", "cases",
]
UNIT_PATTERN = "|".join(sorted(UNIT_WORDS, key=len, reverse=True))
PACK_RE = re.compile(rf"\((\d+(?:\.\d+)?)\s*({UNIT_PATTERN})\)", re.IGNORECASE)
INLINE_RE = re.compile(rf"(?<![\w(])(\d+(?:\.\d+)?)\s*({UNIT_PATTERN})\b", re.IGNORECASE)


def parse_pack_info(item_name: str):
    """Return (clean_item_name, pack_qty, pack_unit)."""
    if not item_name:
        return "", None, ""
    qty = None
    unit = ""
    clean = item_name

    m = PACK_RE.search(item_name)
    if m:
        qty = float(m.group(1))
        unit = m.group(2).lower()
        clean = PACK_RE.sub("", item_name)
    else:
        m2 = INLINE_RE.search(item_name)
        if m2:
            qty = float(m2.group(1))
            unit = m2.group(2).lower()
            clean = INLINE_RE.sub("", item_name)

    clean = re.sub(r"\s+", " ", clean).strip(" -,")
    qty_int = int(qty) if qty is not None and qty == int(qty) else qty
    return clean, qty_int, unit


# ---- Category endpoints ----
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    items = await db.categories.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    for it in items:
        if isinstance(it.get("created_at"), str):
            it["created_at"] = datetime.fromisoformat(it["created_at"])
    return items


@api_router.post("/categories", response_model=Category)
async def create_category(payload: CategoryCreate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(400, "Name is required")
    existing = await db.categories.find_one({"name": name}, {"_id": 0})
    if existing:
        if isinstance(existing.get("created_at"), str):
            existing["created_at"] = datetime.fromisoformat(existing["created_at"])
        return existing
    obj = Category(name=name)
    doc = obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.categories.insert_one(doc)
    return obj


@api_router.delete("/categories/{cat_id}")
async def delete_category(cat_id: str):
    res = await db.categories.delete_one({"id": cat_id})
    return {"deleted": res.deleted_count}


# ---- Product endpoints ----
@api_router.post("/parse-name")
async def parse_name(payload: ParseRequest):
    clean, qty, unit = parse_pack_info(payload.item_name)
    return {"clean_item_name": clean, "pack_qty": qty, "pack_unit": unit}


@api_router.get("/products", response_model=List[Product])
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    missing_image: Optional[bool] = None,
    limit: int = 1000,
):
    query = {}
    if q:
        query["$or"] = [
            {"item_name": {"$regex": q, "$options": "i"}},
            {"clean_item_name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if missing_image is True:
        query["$and"] = query.get("$and", []) + [
            {"$or": [{"image": ""}, {"image": None}]}
        ]
    items = await db.products.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for it in items:
        if isinstance(it.get("created_at"), str):
            try:
                it["created_at"] = datetime.fromisoformat(it["created_at"])
            except Exception:
                it["created_at"] = datetime.now(timezone.utc)
    return items


@api_router.post("/products", response_model=Product)
async def create_product(payload: ProductCreate):
    data = payload.model_dump()
    if not data.get("clean_item_name") or data.get("pack_qty") is None or not data.get("pack_unit"):
        clean, qty, unit = parse_pack_info(data["item_name"])
        if not data.get("clean_item_name"):
            data["clean_item_name"] = clean
        if data.get("pack_qty") is None:
            data["pack_qty"] = qty
        if not data.get("pack_unit"):
            data["pack_unit"] = unit
    obj = Product(**data)
    doc = obj.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    return obj


@api_router.get("/products/{pid}", response_model=Product)
async def get_product(pid: str):
    item = await db.products.find_one({"id": pid}, {"_id": 0})
    if not item:
        raise HTTPException(404, "Not found")
    if isinstance(item.get("created_at"), str):
        item["created_at"] = datetime.fromisoformat(item["created_at"])
    return item


@api_router.put("/products/{pid}", response_model=Product)
async def update_product(pid: str, payload: ProductUpdate):
    data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "item_name" in data:
        clean, qty, unit = parse_pack_info(data["item_name"])
        data.setdefault("clean_item_name", clean)
        if "pack_qty" not in data:
            data["pack_qty"] = qty
        if "pack_unit" not in data:
            data["pack_unit"] = unit
    res = await db.products.update_one({"id": pid}, {"$set": data})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    item = await db.products.find_one({"id": pid}, {"_id": 0})
    if isinstance(item.get("created_at"), str):
        item["created_at"] = datetime.fromisoformat(item["created_at"])
    return item


@api_router.delete("/products/{pid}")
async def delete_product(pid: str):
    res = await db.products.delete_one({"id": pid})
    return {"deleted": res.deleted_count}


@api_router.post("/products/{pid}/assign-image")
async def assign_image(pid: str, payload: AssignImage):
    res = await db.products.update_one({"id": pid}, {"$set": {"image": payload.image}})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"ok": True}


# ---- Dashboard ----
@api_router.get("/dashboard/stats")
async def dashboard_stats():
    total = await db.products.count_documents({})
    cat_count = await db.categories.count_documents({})
    missing = await db.products.count_documents({"$or": [{"image": ""}, {"image": None}]})
    active = await db.products.count_documents({"status": "active"})
    inactive = await db.products.count_documents({"status": {"$ne": "active"}})
    recent = await db.products.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    for r in recent:
        if isinstance(r.get("created_at"), str):
            try:
                r["created_at"] = datetime.fromisoformat(r["created_at"]).isoformat()
            except Exception:
                r["created_at"] = datetime.now(timezone.utc).isoformat()
    # Category counts
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    cat_breakdown = []
    async for doc in db.products.aggregate(pipeline):
        cat_breakdown.append({"category": doc["_id"] or "Uncategorized", "count": doc["count"]})
    return {
        "total_products": total,
        "total_categories": cat_count,
        "missing_images": missing,
        "active_products": active,
        "inactive_products": inactive,
        "recent_products": recent,
        "category_breakdown": cat_breakdown,
    }


# ---- Image management ----
@api_router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(400, "Unsupported image type")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename)
    unique = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    dest = UPLOAD_DIR / unique
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    # Track in db (so we can list unmatched)
    rec = {
        "filename": unique,
        "original_name": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.uploads.insert_one(rec)
    return {"filename": unique, "url": f"/api/uploads/{unique}"}


@api_router.get("/images/unmatched")
async def unmatched_images():
    uploads = await db.uploads.find({}, {"_id": 0}).sort("uploaded_at", -1).to_list(2000)
    used = await db.products.distinct("image")
    used_set = {u for u in used if u}
    out = [u for u in uploads if u["filename"] not in used_set]
    return out


@api_router.get("/images/missing-products", response_model=List[Product])
async def missing_image_products():
    items = await db.products.find(
        {"$or": [{"image": ""}, {"image": None}]}, {"_id": 0}
    ).sort("created_at", -1).to_list(2000)
    for it in items:
        if isinstance(it.get("created_at"), str):
            try:
                it["created_at"] = datetime.fromisoformat(it["created_at"])
            except Exception:
                it["created_at"] = datetime.now(timezone.utc)
    return items


@api_router.delete("/images/{filename}")
async def delete_image(filename: str):
    path = UPLOAD_DIR / filename
    if path.exists():
        path.unlink()
    await db.uploads.delete_one({"filename": filename})
    await db.products.update_many({"image": filename}, {"$set": {"image": ""}})
    return {"ok": True}


@api_router.get("/uploads/{filename}")
async def serve_upload(filename: str):
    path = UPLOAD_DIR / filename
    if not path.exists():
        raise HTTPException(404, "Not found")
    return FileResponse(path)


# ---- Import / Export ----
@api_router.post("/import")
async def import_products(file: UploadFile = File(...)):
    content = await file.read()
    ext = Path(file.filename).suffix.lower()
    try:
        if ext in [".xlsx", ".xls"]:
            df = pd.read_excel(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    inserted = 0
    skipped = 0
    new_categories = set()
    for _, row in df.iterrows():
        item_name = str(row.get("item_name", "")).strip()
        if not item_name or item_name.lower() == "nan":
            skipped += 1
            continue
        clean, qty, unit = parse_pack_info(item_name)
        category = str(row.get("category", "")).strip()
        if category and category.lower() != "nan":
            new_categories.add(category)
        else:
            category = ""
        try:
            price = float(row.get("price", 0) or 0)
        except Exception:
            price = 0
        pack_qty_in = row.get("pack_qty")
        try:
            pack_qty = int(pack_qty_in) if pack_qty_in not in (None, "", "nan") else qty
        except Exception:
            pack_qty = qty
        product = Product(
            item_name=item_name,
            clean_item_name=str(row.get("clean_item_name", "") or clean).strip() or clean,
            category=category,
            description=str(row.get("description", "") or "").strip(),
            price=price,
            pack_qty=pack_qty,
            pack_unit=(str(row.get("pack_unit", "") or unit).strip() or unit).lower(),
            image=str(row.get("image", "") or "").strip(),
            status=(str(row.get("status", "") or "active").strip().lower() or "active"),
        )
        doc = product.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.products.insert_one(doc)
        inserted += 1

    for cat in new_categories:
        existing = await db.categories.find_one({"name": cat})
        if not existing:
            obj = Category(name=cat)
            d = obj.model_dump()
            d["created_at"] = d["created_at"].isoformat()
            await db.categories.insert_one(d)

    return {"inserted": inserted, "skipped": skipped, "new_categories": len(new_categories)}


@api_router.get("/export")
async def export_products(format: str = Query("csv")):
    items = await db.products.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    cols = ["item_name", "clean_item_name", "category", "description", "price",
            "pack_qty", "pack_unit", "image", "status"]
    rows = []
    for it in items:
        rows.append({c: it.get(c, "") for c in cols})
    df = pd.DataFrame(rows, columns=cols)

    if format == "xlsx":
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df.to_excel(writer, index=False, sheet_name="Products")
        buf.seek(0)
        return StreamingResponse(
            buf,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=xltraders_products.xlsx"},
        )
    # default csv
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=xltraders_products.csv"},
    )


@api_router.get("/")
async def root():
    return {"app": "XL Traders Catalog", "ok": True}


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
