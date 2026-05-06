import React, { useEffect, useState } from "react";
import { api, imgUrl } from "../lib/api";
import { Search, Share2 } from "lucide-react";
import MissingImage from "../components/MissingImage";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";

export default function CatalogView() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  useEffect(() => {
    api.get("/categories").then((r) => setCategories(r.data));
  }, []);

  useEffect(() => {
    const params = { status: "active" };
    if (q) params.q = q;
    if (cat !== "all") params.category = cat;
    api.get("/products", { params }).then((r) => setProducts(r.data));
  }, [q, cat]);

  const share = (p) => {
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

  return (
    <div className="space-y-6" data-testid="catalog-view-page">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="label-eyebrow mb-2">Public</div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Catalog</h1>
          <p className="text-sm text-neutral-500 mt-2">Share-friendly grid. Tap green button to send via WhatsApp.</p>
        </div>
      </header>

      <div className="bg-white border border-neutral-200 p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            data-testid="catalog-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="w-full border border-neutral-300 pl-9 pr-3 py-2 text-sm rounded-none focus:outline-none focus:ring-2 focus:ring-[#0055FF]"
          />
        </div>
        <div className="md:col-span-4">
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger data-testid="catalog-filter-category" className="rounded-none">
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
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-neutral-200 p-10 text-center text-sm text-neutral-500">
          No products to display.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {products.map((p) => (
            <article
              key={p.id}
              data-testid={`catalog-card-${p.id}`}
              className="product-card bg-white border border-neutral-200 flex flex-col"
            >
              {p.image ? (
                <img src={imgUrl(p.image)} alt={p.clean_item_name || p.item_name} className="w-full aspect-square object-cover" />
              ) : (
                <MissingImage className="w-full aspect-square" size={36} />
              )}
              <div className="p-3 flex flex-col gap-2 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm leading-tight line-clamp-2">
                      {p.clean_item_name || p.item_name}
                    </h3>
                    {p.category && (
                      <div className="label-eyebrow mt-1 truncate">{p.category}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="numeric font-bold text-base">₹{Number(p.price || 0).toFixed(2)}</div>
                  {p.pack_qty ? (
                    <div className="text-[10px] mono border border-neutral-300 px-1.5 py-0.5">
                      {p.pack_qty} {p.pack_unit}
                    </div>
                  ) : null}
                </div>
                <button
                  data-testid={`whatsapp-share-btn-${p.id}`}
                  onClick={() => share(p)}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-[#25D366] text-white text-xs font-semibold tracking-wide px-3 py-2 hover:bg-[#1FB957] transition-colors"
                >
                  <Share2 size={12} /> SHARE ON WHATSAPP
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
