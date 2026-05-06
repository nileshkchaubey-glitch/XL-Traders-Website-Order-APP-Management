import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "../lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Upload, Link as LinkIcon, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import MissingImage from "../components/MissingImage";

export default function ImageManager() {
  const [unmatched, setUnmatched] = useState([]);
  const [missing, setMissing] = useState([]);
  const [matchTarget, setMatchTarget] = useState(null); // image filename
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState([]);

  const load = useCallback(async () => {
    const [u, m] = await Promise.all([
      api.get("/images/unmatched"),
      api.get("/images/missing-products"),
    ]);
    setUnmatched(u.data);
    setMissing(m.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!matchTarget) return;
    const params = productSearch ? { q: productSearch } : { missing_image: true };
    api.get("/products", { params }).then((r) => setProducts(r.data));
  }, [matchTarget, productSearch]);

  const onUpload = async (files) => {
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      await api.post("/upload", fd);
    }
    toast.success(`${files.length} image(s) uploaded`);
    load();
  };

  const linkTo = async (productId) => {
    await api.post(`/products/${productId}/assign-image`, { image: matchTarget });
    toast.success("Image linked");
    setMatchTarget(null);
    setProductSearch("");
    load();
  };

  const deleteImage = async (filename) => {
    if (!window.confirm("Delete this image?")) return;
    await api.delete(`/images/${filename}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6" data-testid="image-manager-page">
      <header>
        <div className="label-eyebrow mb-2">Visual</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Image Manager</h1>
        <p className="text-sm text-neutral-500 mt-2">Upload images, match them to products, and find products without images.</p>
      </header>

      {/* Upload zone */}
      <label className="block bg-white border border-dashed border-neutral-400 p-8 text-center cursor-pointer hover:bg-[#F5F5F5] transition-colors">
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          data-testid="bulk-upload-input"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
        <div className="inline-flex flex-col items-center gap-2">
          <Upload size={28} strokeWidth={1.5} />
          <div className="font-display font-semibold tracking-tight">Drop images or click to upload</div>
          <div className="text-xs text-neutral-500">JPG, PNG, WEBP — up to multiple at once</div>
        </div>
      </label>

      <Tabs defaultValue="missing">
        <TabsList className="rounded-none bg-white border border-neutral-200 p-0 h-auto">
          <TabsTrigger
            value="missing"
            data-testid="tab-missing-products"
            className="rounded-none px-4 py-2 data-[state=active]:bg-[#171717] data-[state=active]:text-white"
          >
            Products Missing Image ({missing.length})
          </TabsTrigger>
          <TabsTrigger
            value="unmatched"
            data-testid="tab-unmatched-images"
            className="rounded-none px-4 py-2 data-[state=active]:bg-[#171717] data-[state=active]:text-white"
          >
            Unmatched Images ({unmatched.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="missing" className="mt-4">
          {missing.length === 0 ? (
            <div className="bg-white border border-neutral-200 p-10 text-center text-sm text-neutral-500">
              All products have images.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {missing.map((p) => (
                <div key={p.id} className="bg-white border border-neutral-200 p-3 flex flex-col gap-2">
                  <MissingImage className="w-full aspect-square border border-neutral-200" size={28} />
                  <div className="text-xs font-medium truncate">{p.clean_item_name || p.item_name}</div>
                  <div className="text-[10px] text-neutral-500 truncate">{p.category || "—"}</div>
                  <Link
                    to={`/products/${p.id}/edit`}
                    data-testid={`fix-image-${p.id}`}
                    className="text-xs text-[#0055FF] underline"
                  >
                    Add image →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="unmatched" className="mt-4">
          {unmatched.length === 0 ? (
            <div className="bg-white border border-neutral-200 p-10 text-center text-sm text-neutral-500">
              No unmatched images. Upload some above.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {unmatched.map((u) => (
                <div key={u.filename} className="bg-white border border-neutral-200 p-2 flex flex-col gap-2">
                  <img src={imgUrl(u.filename)} alt="" className="w-full aspect-square object-cover border border-neutral-200" />
                  <div className="text-[10px] mono truncate" title={u.original_name}>{u.original_name}</div>
                  <div className="flex gap-1">
                    <button
                      data-testid={`match-${u.filename}`}
                      className="flex-1 text-[11px] inline-flex items-center justify-center gap-1 px-2 py-1 bg-[#0055FF] text-white hover:bg-[#0044CC]"
                      onClick={() => setMatchTarget(u.filename)}
                    >
                      <LinkIcon size={11} /> Match
                    </button>
                    <button
                      data-testid={`delete-img-${u.filename}`}
                      className="px-2 py-1 text-[#EF4444] border border-neutral-300 hover:border-[#EF4444]"
                      onClick={() => deleteImage(u.filename)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Match dialog */}
      <Dialog open={!!matchTarget} onOpenChange={(v) => !v && setMatchTarget(null)}>
        <DialogContent className="rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display tracking-tight">Match image to product</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="label-eyebrow mb-2">Image</div>
              {matchTarget && (
                <img src={imgUrl(matchTarget)} alt="" className="w-full aspect-square object-cover border border-neutral-200" />
              )}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Input
                data-testid="match-search"
                placeholder="Search products by name..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="rounded-none"
              />
              <div className="max-h-72 overflow-y-auto border border-neutral-200">
                {products.length === 0 ? (
                  <div className="p-4 text-sm text-neutral-500 text-center">No products.</div>
                ) : (
                  products.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => linkTo(p.id)}
                      data-testid={`link-to-${p.id}`}
                      className="w-full flex items-center gap-3 px-3 py-2 border-b border-neutral-100 last:border-b-0 hover:bg-[#F5F5F5] text-left"
                    >
                      {p.image ? (
                        <img src={imgUrl(p.image)} alt="" className="w-8 h-8 object-cover border border-neutral-200" />
                      ) : (
                        <MissingImage className="w-8 h-8 border border-neutral-200" size={12} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{p.clean_item_name || p.item_name}</div>
                        <div className="text-[11px] text-neutral-500 truncate">{p.category || "—"}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchTarget(null)} className="rounded-none" data-testid="match-cancel">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
