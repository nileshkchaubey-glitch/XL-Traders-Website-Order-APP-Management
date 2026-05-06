# XL Traders — Catalog App (PRD)

## Original Problem Statement
Build a simple business catalog app for XL Traders that is easy to use daily. Not a heavy full-stack system. Google Sheets / CSV style data handling. Quickly add products, manage categories, upload/match images, view catalog, share product on WhatsApp, export data easily. Required pages: Dashboard, Products, Add Product, Categories, Image Manager, Import/Export, Catalog View. Auto-split pack info from item name (e.g. "(6000 pcs)", "(20 pkt)", "(10 roll)"). Mobile-friendly with search/filter/quick edit, image upload + matching, missing-image visibility.

## User Choices
- Storage: MongoDB + CSV import/export
- Image storage: Local upload to server (`/app/backend/uploads`)
- Auth: None (open daily-use app)
- Export: CSV + Excel (.xlsx)
- WhatsApp: `wa.me/?text=...` link with product text + image URL

## User Personas
- Trader / Owner: adds new stock daily, exports for accounting, shares to customers via WhatsApp
- Staff: quick-edits prices, manages images, does bulk imports

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB) + pandas/openpyxl for import/export
- **Frontend**: React 19 + react-router 7 + Tailwind + shadcn UI + lucide-react
- **Design**: Swiss & High-Contrast (light theme, blue #0055FF primary, WhatsApp #25D366, sharp 2-4px radius, IBM Plex Sans body + Space Grotesk display)

## Implemented (Feb 2026)
### Backend (`/app/backend/server.py`)
- `GET /api/dashboard/stats` — totals, missing-image count, recent + category breakdown
- Categories: `GET/POST /api/categories`, `DELETE /api/categories/{id}`
- Products: full CRUD with `q`, `category`, `status`, `missing_image` filters
- `POST /api/parse-name` — regex extraction of pack info (15+ unit words: pcs, pkt, roll, box, kg, ml, dozen, …)
- Auto-parse on `POST /api/products` if pack fields missing
- `POST /api/upload` (image, validates type), `GET /api/uploads/{filename}` static serve
- `GET /api/images/unmatched`, `GET /api/images/missing-products`
- `POST /api/products/{id}/assign-image`, `DELETE /api/images/{filename}`
- `POST /api/import` (CSV/XLSX) auto-parses pack + creates new categories
- `GET /api/export?format=csv|xlsx`

### Frontend (7 pages)
- **Dashboard**: 4 stat cards, recent products, category bar breakdown, quick actions
- **Products**: search, category/status/missing filters, table with thumbnails, quick-edit dialog, full-edit page, WhatsApp share, delete
- **Add/Edit Product**: form with auto-parse on blur, image upload sidebar, category picker
- **Categories**: inline add/delete
- **Image Manager**: bulk upload zone, tabs for "Missing Image Products" + "Unmatched Images", match-to-product dialog with search
- **Import / Export**: CSV/XLSX file pickers + download buttons, sample CSV format
- **Catalog View**: customer-facing grid (active products only), WhatsApp share per card

### Quality
- 21/21 backend pytest tests passing
- All frontend critical flows verified via Playwright
- `data-testid` on every interactive element

## Backlog
### P1 (next session)
- Currency setting (₹ hardcoded) + multi-currency display
- Bulk price update (% change) on selected products
- Product duplicate detection on import (upsert by item_name)
- Public shareable catalog URL (read-only) for WhatsApp broadcasts
- Print-ready PDF catalog export

### P2
- Barcode/SKU field + scan-to-add (mobile camera)
- Stock quantity tracking (currently pack info only)
- Low-stock alerts on dashboard
- Customer enquiry capture from catalog view
- Multi-image gallery per product
- Audit log for price changes

## Next Action Items
- Awaiting user feedback on first run; tweak UX where needed
