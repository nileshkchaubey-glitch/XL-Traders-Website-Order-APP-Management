import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, imgUrl } from "../lib/api";
import { Search, Pencil, Trash2, Share2, Plus, X } from "lucide-react";
import MissingImage from "../components/MissingImage";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const params = {};
    if (q) params.q = q;
    if (filterCat !== "all") params.category = filterCat;
    if (filterStatus !== "all") params.status = filterStatus;
    if (missing) params.missing_image = true;
    const r = await api.get("/products", { params });
    setProducts(r.data);
  }, [q, filterCat, filterStatus, missing]);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const onDelete = async (p) => {
    if (!window.confirm(`Delete "${p.clean_item_name || p.item_name}"?`)) return;
    await api.delete(`/products/${p.id}`);
    toast.success("Product deleted");
    load();
  };

  const shareWhatsApp = (p) => {
    const lines = [
      `*${p.clean_item_name || p.item_name}*`,
      p.category ? `Category: ${p.category}` : null,
      p.pack_qty ? `Pack: ${p.pack_qty} ${p.pack_unit || ""}` : null,
      p.price ? `Price: ₹${Number(p.price).toFixed(2)}` : null,
      p.description || null,
      p.image ? imgUrl(p.image) : null,
    ].filter(Boolean);
    const url = `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
    window.open(url, "_blank");
  };

  const saveQuickEdit = async () => {
    const { id, ...payload } = editing;
    await api.put(`/products/${id}`, payload);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-6" data-testid="products-page">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="label-eyebrow mb-2">Catalog</div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Products</h1>
        </div>
        <Link
          to="/products/new"
          data-testid="add-product-btn"
          className="inline-flex items-center gap-2 bg-[#0055FF] text-white px-4 py-2 text-sm font-semibold tracking-tight hover:bg-[#0044CC] transition-colors"
        >
          <Plus size={16} /> Add Product
        </Link>
      </header>

      {/* Filters */}
      <div className="bg-white border border-neutral-200 p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            data-testid="products-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by item, description..."
            className="w-full border border-neutral-300 pl-9 pr-3 py-2 text-sm rounded-none focus:outline-none focus:ring-2 focus:ring-[#0055FF]"
          />
        </div>
        <div className="md:col-span-3">
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger data-testid="filter-category" className="rounded-none">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger data-testid="filter-status" className="rounded-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="md:col-span-2 flex items-center gap-2 text-sm border border-neutral-300 px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            data-testid="filter-missing"
            checked={missing}
            onChange={(e) => setMissing(e.target.checked)}
          />
          Missing image
        </label>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 overflow-x-auto">
        <table className="w-full text-sm" data-testid="products-table">
          <thead>
            <tr className="text-left border-b border-neutral-200 bg-[#FAFAFA]">
              <th className="px-4 py-3 label-eyebrow w-16">Image</th>
              <th className="px-4 py-3 label-eyebrow">Item</th>
              <th className="px-4 py-3 label-eyebrow hidden md:table-cell">Category</th>
              <th className="px-4 py-3 label-eyebrow hidden lg:table-cell">Pack</th>
              <th className="px-4 py-3 label-eyebrow text-right">Price</th>
              <th className="px-4 py-3 label-eyebrow hidden md:table-cell">Status</th>
              <th className="px-4 py-3 label-eyebrow text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-16 text-center text-neutral-500">
                No products found.
              </td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 last:border-b-0 hover:bg-[#FAFAFA] group">
                  <td className="px-4 py-3">
                    {p.image ? (
                      <img src={imgUrl(p.image)} alt="" className="w-10 h-10 object-cover border border-neutral-200" />
                    ) : (
                      <MissingImage className="w-10 h-10 border border-neutral-200" size={16} />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium truncate max-w-[28ch]">{p.clean_item_name || p.item_name}</div>
                    <div className="text-xs text-neutral-500 truncate max-w-[28ch]">{p.item_name}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.category ? (
                      <span className="text-xs border border-neutral-300 px-2 py-0.5">{p.category}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell numeric text-xs">
                    {p.pack_qty ? `${p.pack_qty} ${p.pack_unit || ""}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right numeric font-semibold">₹{Number(p.price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 ${p.status === "active" ? "bg-[#E6F7EC] text-[#0F7B3A]" : "bg-neutral-100 text-neutral-500"}`}>
                      {p.status || "active"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        data-testid={`whatsapp-share-${p.id}`}
                        onClick={() => shareWhatsApp(p)}
                        className="p-2 text-[#25D366] hover:bg-[#E7F9EE]"
                        title="Share on WhatsApp"
                      >
                        <Share2 size={15} />
                      </button>
                      <button
                        data-testid={`quick-edit-${p.id}`}
                        onClick={() => setEditing({ ...p })}
                        className="p-2 hover:bg-neutral-100"
                        title="Quick edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        data-testid={`full-edit-${p.id}`}
                        onClick={() => navigate(`/products/${p.id}/edit`)}
                        className="hidden md:inline-block px-2 py-1 text-xs border border-neutral-300 hover:border-black"
                      >
                        Edit
                      </button>
                      <button
                        data-testid={`delete-${p.id}`}
                        onClick={() => onDelete(p)}
                        className="p-2 text-[#EF4444] hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Quick edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Quick Edit</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Item name</Label>
                <Input
                  data-testid="qe-item-name"
                  value={editing.item_name}
                  onChange={(e) => setEditing({ ...editing, item_name: e.target.value })}
                  className="rounded-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price</Label>
                  <Input
                    data-testid="qe-price"
                    type="number" step="0.01"
                    value={editing.price ?? 0}
                    onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) })}
                    className="rounded-none"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={editing.category || ""}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger data-testid="qe-category" className="rounded-none">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Pack qty</Label>
                  <Input
                    data-testid="qe-pack-qty"
                    type="number"
                    value={editing.pack_qty ?? ""}
                    onChange={(e) => setEditing({ ...editing, pack_qty: e.target.value ? parseInt(e.target.value) : null })}
                    className="rounded-none"
                  />
                </div>
                <div>
                  <Label>Pack unit</Label>
                  <Input
                    data-testid="qe-pack-unit"
                    value={editing.pack_unit ?? ""}
                    onChange={(e) => setEditing({ ...editing, pack_unit: e.target.value })}
                    className="rounded-none"
                  />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={editing.status || "active"}
                    onValueChange={(v) => setEditing({ ...editing, status: v })}
                  >
                    <SelectTrigger data-testid="qe-status" className="rounded-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">active</SelectItem>
                      <SelectItem value="inactive">inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} className="rounded-none" data-testid="qe-cancel">
              <X size={14} className="mr-1" /> Cancel
            </Button>
            <Button onClick={saveQuickEdit} className="rounded-none bg-[#0055FF] hover:bg-[#0044CC]" data-testid="qe-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
