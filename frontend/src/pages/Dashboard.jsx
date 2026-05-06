import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, imgUrl } from "../lib/api";
import { Package, Tags, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import MissingImage from "../components/MissingImage";

const StatCard = ({ label, value, icon: Icon, accent = "text-[#171717]", testid }) => (
  <div
    data-testid={testid}
    className="bg-white border border-neutral-200 p-5 flex flex-col gap-3 hover:border-[#171717] transition-colors duration-150"
  >
    <div className="flex items-center justify-between">
      <span className="label-eyebrow">{label}</span>
      <Icon size={18} strokeWidth={1.5} className={accent} />
    </div>
    <div className={`font-display font-bold text-4xl numeric ${accent}`}>{value}</div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => setStats(null));
  }, []);

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <header>
        <div className="label-eyebrow mb-2">Overview</div>
        <h1 className="font-display font-bold text-3xl sm:text-4xl tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-2">Quick view of your XL Traders catalog.</p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard testid="stat-total-products" label="Total Products" value={stats?.total_products ?? 0} icon={Package} />
        <StatCard testid="stat-categories" label="Categories" value={stats?.total_categories ?? 0} icon={Tags} />
        <StatCard
          testid="stat-missing-images"
          label="Missing Images"
          value={stats?.missing_images ?? 0}
          icon={AlertTriangle}
          accent={(stats?.missing_images ?? 0) > 0 ? "text-[#EF4444]" : "text-[#171717]"}
        />
        <StatCard testid="stat-active" label="Active" value={stats?.active_products ?? 0} icon={CheckCircle2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent products */}
        <section className="lg:col-span-2 bg-white border border-neutral-200">
          <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg tracking-tight">Recent Products</h2>
            <Link to="/products" data-testid="link-view-all-products" className="text-xs uppercase tracking-widest font-semibold text-[#0055FF] flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <ul>
            {(stats?.recent_products || []).length === 0 ? (
              <li className="px-5 py-10 text-center text-sm text-neutral-500">
                No products yet. <Link to="/products/new" className="underline text-[#0055FF]">Add your first product</Link>.
              </li>
            ) : (
              (stats?.recent_products || []).map((p) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-3 border-b border-neutral-100 last:border-b-0">
                  {p.image ? (
                    <img src={imgUrl(p.image)} alt={p.item_name} className="w-12 h-12 object-cover border border-neutral-200" />
                  ) : (
                    <MissingImage className="w-12 h-12 border border-neutral-200" size={18} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.clean_item_name || p.item_name}</div>
                    <div className="text-xs text-neutral-500 truncate">
                      {p.category || "Uncategorized"}
                      {p.pack_qty ? ` · ${p.pack_qty} ${p.pack_unit || ""}` : ""}
                    </div>
                  </div>
                  <div className="numeric text-sm font-semibold">₹{Number(p.price || 0).toFixed(2)}</div>
                </li>
              ))
            )}
          </ul>
        </section>

        {/* Category breakdown */}
        <section className="bg-white border border-neutral-200">
          <div className="px-5 py-3 border-b border-neutral-200">
            <h2 className="font-display font-semibold text-lg tracking-tight">By Category</h2>
          </div>
          <ul className="p-5 space-y-3">
            {(stats?.category_breakdown || []).length === 0 ? (
              <li className="text-sm text-neutral-500">No data.</li>
            ) : (
              (stats?.category_breakdown || []).slice(0, 8).map((c) => {
                const pct = stats.total_products
                  ? Math.round((c.count / stats.total_products) * 100)
                  : 0;
                return (
                  <li key={c.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="truncate">{c.category}</span>
                      <span className="numeric font-semibold">{c.count}</span>
                    </div>
                    <div className="h-1.5 bg-neutral-100">
                      <div className="h-1.5 bg-[#0055FF]" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/products/new"
          data-testid="quick-action-add"
          className="bg-[#0055FF] text-white px-5 py-4 flex items-center justify-between hover:bg-[#0044CC] transition-colors duration-150"
        >
          <span className="font-display font-semibold tracking-tight">Add Product</span>
          <ArrowRight size={18} />
        </Link>
        <Link
          to="/import-export"
          data-testid="quick-action-import"
          className="bg-white border border-neutral-300 px-5 py-4 flex items-center justify-between hover:border-black transition-colors duration-150"
        >
          <span className="font-display font-semibold tracking-tight">Import / Export</span>
          <ArrowRight size={18} />
        </Link>
        <Link
          to="/images"
          data-testid="quick-action-images"
          className="bg-white border border-neutral-300 px-5 py-4 flex items-center justify-between hover:border-black transition-colors duration-150"
        >
          <span className="font-display font-semibold tracking-tight">Image Manager</span>
          <ArrowRight size={18} />
        </Link>
      </div>
    </div>
  );
}
