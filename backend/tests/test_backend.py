"""Backend tests for XL Traders Catalog"""
import io
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://easy-inventory-28.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    return s


# ---------------- Parse name ----------------
class TestParseName:
    def test_paren_pcs(self, session):
        r = session.post(f"{API}/parse-name", json={"item_name": "Tissue Paper Box (6000 pcs)"})
        assert r.status_code == 200
        d = r.json()
        assert d["clean_item_name"] == "Tissue Paper Box"
        assert d["pack_qty"] == 6000
        assert d["pack_unit"] == "pcs"

    def test_paren_pkt(self, session):
        r = session.post(f"{API}/parse-name", json={"item_name": "A4 (20 pkt)"})
        assert r.status_code == 200
        d = r.json()
        assert d["pack_qty"] == 20
        assert d["pack_unit"] == "pkt"
        assert d["clean_item_name"] == "A4"

    def test_inline_roll(self, session):
        r = session.post(f"{API}/parse-name", json={"item_name": "Cling Film 10 roll"})
        assert r.status_code == 200
        d = r.json()
        assert d["pack_qty"] == 10
        assert d["pack_unit"] == "roll"
        assert "Cling Film" in d["clean_item_name"]


# ---------------- Categories CRUD ----------------
class TestCategories:
    cat_id = None

    def test_create(self, session):
        r = session.post(f"{API}/categories", json={"name": "TEST_Stationery"})
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Stationery"
        assert "id" in data
        TestCategories.cat_id = data["id"]

    def test_list(self, session):
        r = session.get(f"{API}/categories")
        assert r.status_code == 200
        names = [c["name"] for c in r.json()]
        assert "TEST_Stationery" in names

    def test_delete(self, session):
        assert TestCategories.cat_id
        r = session.delete(f"{API}/categories/{TestCategories.cat_id}")
        assert r.status_code == 200
        assert r.json().get("deleted") == 1


# ---------------- Products CRUD ----------------
class TestProducts:
    pid = None

    def test_create_autoparse(self, session):
        r = session.post(f"{API}/products", json={
            "item_name": "TEST_Tissue Paper Box (6000 pcs)",
            "category": "TEST_Cat",
            "price": 99.5,
        })
        assert r.status_code == 200
        d = r.json()
        assert d["clean_item_name"] == "TEST_Tissue Paper Box"
        assert d["pack_qty"] == 6000
        assert d["pack_unit"] == "pcs"
        assert d["status"] == "active"
        TestProducts.pid = d["id"]

    def test_get(self, session):
        r = session.get(f"{API}/products/{TestProducts.pid}")
        assert r.status_code == 200
        assert r.json()["id"] == TestProducts.pid

    def test_list_filters(self, session):
        r = session.get(f"{API}/products", params={"q": "TEST_Tissue"})
        assert r.status_code == 200
        assert any(p["id"] == TestProducts.pid for p in r.json())

        r2 = session.get(f"{API}/products", params={"status": "active"})
        assert r2.status_code == 200

        r3 = session.get(f"{API}/products", params={"missing_image": "true"})
        assert r3.status_code == 200
        # Our product has no image
        assert any(p["id"] == TestProducts.pid for p in r3.json())

    def test_update(self, session):
        r = session.put(f"{API}/products/{TestProducts.pid}", json={"price": 150})
        assert r.status_code == 200
        assert r.json()["price"] == 150
        # verify persisted
        g = session.get(f"{API}/products/{TestProducts.pid}").json()
        assert g["price"] == 150

    def test_delete(self, session):
        r = session.delete(f"{API}/products/{TestProducts.pid}")
        assert r.status_code == 200
        # verify gone
        g = session.get(f"{API}/products/{TestProducts.pid}")
        assert g.status_code == 404


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_stats(self, session):
        r = session.get(f"{API}/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ["total_products", "total_categories", "missing_images", "active_products",
                  "inactive_products", "recent_products", "category_breakdown"]:
            assert k in d
        assert isinstance(d["recent_products"], list)


# ---------------- Image upload + unmatched + assign + delete ----------------
class TestImages:
    filename = None
    pid = None

    def _tiny_png(self):
        # 1x1 transparent PNG
        return (b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
                b'\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\rIDATx\x9cc\x00\x01'
                b'\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')

    def test_upload(self, session):
        files = {"file": ("TEST_img.png", self._tiny_png(), "image/png")}
        r = session.post(f"{API}/upload", files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "filename" in d and "url" in d
        TestImages.filename = d["filename"]

    def test_serve(self, session):
        r = session.get(f"{API}/uploads/{TestImages.filename}")
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_unmatched_contains(self, session):
        r = session.get(f"{API}/images/unmatched")
        assert r.status_code == 200
        names = [u["filename"] for u in r.json()]
        assert TestImages.filename in names

    def test_missing_products(self, session):
        # Create a product with no image
        p = session.post(f"{API}/products", json={"item_name": "TEST_NoImage"}).json()
        TestImages.pid = p["id"]
        r = session.get(f"{API}/images/missing-products")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        assert TestImages.pid in ids

    def test_assign(self, session):
        r = session.post(f"{API}/products/{TestImages.pid}/assign-image",
                         json={"image": TestImages.filename})
        assert r.status_code == 200
        # Verify no longer unmatched
        r2 = session.get(f"{API}/images/unmatched")
        names = [u["filename"] for u in r2.json()]
        assert TestImages.filename not in names
        # Verify no longer missing
        r3 = session.get(f"{API}/images/missing-products")
        ids = [x["id"] for x in r3.json()]
        assert TestImages.pid not in ids

    def test_delete_image(self, session):
        r = session.delete(f"{API}/images/{TestImages.filename}")
        assert r.status_code == 200
        # Product image reference cleared
        p = session.get(f"{API}/products/{TestImages.pid}").json()
        assert p["image"] in ("", None)
        # cleanup product
        session.delete(f"{API}/products/{TestImages.pid}")


# ---------------- Import / Export ----------------
class TestImportExport:
    def test_import_csv(self, session):
        csv_content = (
            "item_name,category,price,description\n"
            "TEST_ImportItem A (12 pcs),TEST_ImportCat,10,desc1\n"
            "TEST_Roll Thing 5 roll,TEST_ImportCat,20,desc2\n"
        )
        files = {"file": ("import.csv", csv_content.encode(), "text/csv")}
        r = session.post(f"{API}/import", files=files)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["inserted"] == 2
        # Ensure created w/ parsed pack info
        pr = session.get(f"{API}/products", params={"q": "TEST_ImportItem"}).json()
        assert pr and pr[0]["pack_qty"] == 12 and pr[0]["pack_unit"] == "pcs"
        # Category auto-created
        cats = [c["name"] for c in session.get(f"{API}/categories").json()]
        assert "TEST_ImportCat" in cats
        # Cleanup
        for p in session.get(f"{API}/products", params={"q": "TEST_"}).json():
            session.delete(f"{API}/products/{p['id']}")
        for c in session.get(f"{API}/categories").json():
            if c["name"].startswith("TEST_"):
                session.delete(f"{API}/categories/{c['id']}")

    def test_export_csv(self, session):
        r = session.get(f"{API}/export", params={"format": "csv"})
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        assert "item_name" in r.text.split("\n")[0]

    def test_export_xlsx(self, session):
        r = session.get(f"{API}/export", params={"format": "xlsx"})
        assert r.status_code == 200
        ct = r.headers.get("content-type", "")
        assert "spreadsheet" in ct or "xlsx" in ct or "officedocument" in ct
        assert r.content[:2] == b"PK"  # xlsx = zip
