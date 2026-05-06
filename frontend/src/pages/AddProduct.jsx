import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, imgUrl } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Upload, Wand2, Save } from "lucide-react";
import MissingImage from "../components/MissingImage";
import { toast } from "sonner";

const empty = {
  item_name: "",
  clean_item_name: "",
  category: "",
  description: "",
  price: 0,
  pack_qty: null,
  pack_unit: "",
  image: "",
  status: "active",
};

export default function AddProduct() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [autoParsed, setAutoParsed] = useState(false);

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
    if (id) {
      api.get(`/products/${id}`).then((r) => setForm(r.data));
    }
  }, [id]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const autoParse = async (name) => {
    if (!name) return;
    const r = await api.post("/parse-name", { item_name: name });
    setForm((f) => ({
      ...f,
      clean_item_name: r.data.clean_item_name || f.clean_item_name,
      pack_qty: r.data.pack_qty ?? f.pack_qty,
      pack_unit: r.data.pack_unit || f.pack_unit,
    }));
    setAutoParsed(true);
    setTimeout(() => setAutoParsed(false), 1200);
  };

  const onItemBlur = () => autoParse(form.item_name);

  const onUpload = async (file) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setField("image", r.data.filename);
    toast.success("Image uploaded");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim()) {
      toast.error("Item name is required");
      return;
    }
    if (id) {
      await api.put(`/products/${id}`, form);
      toast.success("Product updated");
    } else {
      await api.post("/products", form);
      toast.success("Product added");
    }
    navigate("/products");
  };

  return (
    <div className="space-y-6 max-w-4xl" data-testid="add-product-page">
      <header className="flex items-center justify-between gap-2">
        <div>
          <div className="label-eyebrow mb-2">{id ? "Edit" : "New"}</div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">
            {id ? "Edit Product" : "Add Product"}
          </h1>
        </div>
        <Link to="/products" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-black" data-testid="back-to-products">
          <ArrowLeft size={14} /> Back
        </Link>
      </header>

      <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-neutral-200 p-6 space-y-4">
          <div>
            <Label>Item Name <span className="text-[#EF4444]">*</span></Label>
            <Input
              data-testid="input-item-name"
              value={form.item_name}
              onChange={(e) => setField("item_name", e.target.value)}
              onBlur={onItemBlur}
              placeholder='e.g. Tissue Paper Box (6000 pcs)'
              className="rounded-none"
              required
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-neutral-500">
                Pack info inside parentheses (e.g. <span className="mono">(6000 pcs)</span>) is auto-extracted.
              </p>
              <button
                type="button"
                onClick={() => autoParse(form.item_name)}
                data-testid="auto-parse-btn"
                className="text-xs inline-flex items-center gap-1 text-[#0055FF] hover:underline"
              >
                <Wand2 size={12} /> Auto-parse
              </button>
            </div>
            {autoParsed && (
              <div className="mt-2 inline-block text-[10px] tracking-widest uppercase bg-[#E6F7EC] text-[#0F7B3A] px-2 py-1">
                Parsed
              </div>
            )}
          </div>

          <div>
            <Label>Clean Item Name</Label>
            <Input
              data-testid="input-clean-name"
              value={form.clean_item_name || ""}
              onChange={(e) => setField("clean_item_name", e.target.value)}
              className="rounded-none"
              placeholder="Tissue Paper Box"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Price (₹)</Label>
              <Input
                data-testid="input-price"
                type="number" step="0.01"
                value={form.price ?? 0}
                onChange={(e) => setField("price", parseFloat(e.target.value) || 0)}
                className="rounded-none numeric"
              />
            </div>
            <div>
              <Label>Pack Qty</Label>
              <Input
                data-testid="input-pack-qty"
                type="number"
                value={form.pack_qty ?? ""}
                onChange={(e) => setField("pack_qty", e.target.value ? parseInt(e.target.value) : null)}
                className="rounded-none numeric"
              />
            </div>
            <div>
              <Label>Pack Unit</Label>
              <Input
                data-testid="input-pack-unit"
                value={form.pack_unit || ""}
                onChange={(e) => setField("pack_unit", e.target.value)}
                className="rounded-none"
                placeholder="pcs / pkt / roll"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Category</Label>
              <Select value={form.category || ""} onValueChange={(v) => setField("category", v)}>
                <SelectTrigger className="rounded-none" data-testid="input-category">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && (
                    <div className="px-2 py-3 text-xs text-neutral-500">
                      No categories yet. <Link to="/categories" className="underline">Create one</Link>
                    </div>
                  )}
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status || "active"} onValueChange={(v) => setField("status", v)}>
                <SelectTrigger className="rounded-none" data-testid="input-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              data-testid="input-description"
              value={form.description || ""}
              onChange={(e) => setField("description", e.target.value)}
              rows={4}
              className="rounded-none"
            />
          </div>
        </div>

        {/* Image side panel */}
        <aside className="bg-white border border-neutral-200 p-6 space-y-4 h-fit">
          <div className="label-eyebrow">Product Image</div>

          {form.image ? (
            <img src={imgUrl(form.image)} alt="" className="w-full aspect-square object-cover border border-neutral-200" />
          ) : (
            <MissingImage className="w-full aspect-square border border-neutral-200" size={48} />
          )}

          <label className="block">
            <span className="sr-only">Upload</span>
            <input
              type="file"
              accept="image/*"
              data-testid="image-upload-input"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
              className="hidden"
              id="img-upload"
            />
            <span className="inline-flex w-full justify-center items-center gap-2 px-4 py-2 border border-dashed border-neutral-400 text-sm cursor-pointer hover:bg-[#F5F5F5]" onClick={() => document.getElementById("img-upload").click()}>
              <Upload size={14} /> Upload image
            </span>
          </label>

          {form.image && (
            <button
              type="button"
              onClick={() => setField("image", "")}
              data-testid="remove-image-btn"
              className="text-xs text-neutral-500 underline"
            >
              Remove image
            </button>
          )}
        </aside>

        <div className="lg:col-span-3 flex justify-end gap-2">
          <Link to="/products" className="px-4 py-2 border border-neutral-300 text-sm hover:border-black" data-testid="cancel-btn">
            Cancel
          </Link>
          <Button type="submit" className="rounded-none bg-[#0055FF] hover:bg-[#0044CC]" data-testid="save-product-btn">
            <Save size={14} className="mr-1" /> {id ? "Update" : "Save Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
