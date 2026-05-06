import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");

  const load = () => api.get("/categories").then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/categories", { name: name.trim() });
    setName("");
    toast.success("Category added");
    load();
  };

  const del = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"? Products will keep the category text.`)) return;
    await api.delete(`/categories/${c.id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl" data-testid="categories-page">
      <header>
        <div className="label-eyebrow mb-2">Manage</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Categories</h1>
        <p className="text-sm text-neutral-500 mt-2">
          Organize your products. Categories created here appear in the Add Product form.
        </p>
      </header>

      <form onSubmit={add} className="bg-white border border-neutral-200 p-4 flex gap-2">
        <Input
          data-testid="category-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Stationery, Tissue Paper, Cleaning..."
          className="rounded-none"
        />
        <Button type="submit" className="rounded-none bg-[#0055FF] hover:bg-[#0044CC]" data-testid="add-category-btn">
          <Plus size={14} className="mr-1" /> Add
        </Button>
      </form>

      <div className="bg-white border border-neutral-200">
        <ul>
          {categories.length === 0 ? (
            <li className="px-5 py-12 text-center text-sm text-neutral-500">No categories yet.</li>
          ) : (
            categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3 border-b border-neutral-100 last:border-b-0">
                <span className="font-medium">{c.name}</span>
                <button
                  data-testid={`delete-category-${c.id}`}
                  className="p-2 text-[#EF4444] hover:bg-red-50"
                  onClick={() => del(c)}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
