import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Package, PlusSquare, Tags, Image as ImageIcon,
  ArrowLeftRight, BookOpen, Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "../components/ui/sheet";
import { Toaster } from "../components/ui/sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Products", icon: Package },
  { to: "/products/new", label: "Add Product", icon: PlusSquare },
  { to: "/categories", label: "Categories", icon: Tags },
  { to: "/images", label: "Image Manager", icon: ImageIcon },
  { to: "/import-export", label: "Import / Export", icon: ArrowLeftRight },
  { to: "/catalog", label: "Catalog View", icon: BookOpen },
];

const NavItems = ({ onClick }) => (
  <nav className="flex flex-col gap-1">
    {NAV.map((n) => (
      <NavLink
        key={n.to}
        to={n.to}
        end={n.end}
        onClick={onClick}
        data-testid={`nav-${n.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-150 border-l-2 ${
            isActive
              ? "border-[#0055FF] bg-[#F5F5F5] text-[#0055FF] font-semibold"
              : "border-transparent text-neutral-700 hover:bg-[#F5F5F5] hover:text-black"
          }`
        }
      >
        <n.icon size={18} strokeWidth={1.75} />
        <span className="font-display tracking-tight">{n.label}</span>
      </NavLink>
    ))}
  </nav>
);

const Brand = () => (
  <div className="flex items-center gap-2 px-3 py-4 border-b border-neutral-200">
    <div className="w-8 h-8 bg-[#171717] text-white flex items-center justify-center font-display font-bold text-sm">
      XL
    </div>
    <div>
      <div className="font-display font-bold text-sm tracking-tight leading-none">XL TRADERS</div>
      <div className="label-eyebrow mt-1">Catalog · v1</div>
    </div>
  </div>
);

export default function Layout() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 lg:w-64 border-r border-neutral-200 bg-white flex-col">
        <Brand />
        <div className="px-2 py-3"><NavItems /></div>
        <div className="mt-auto px-3 py-4 text-[10px] tracking-widest uppercase text-neutral-400">
          Built simple. Used daily.
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#171717] text-white flex items-center justify-center font-display font-bold text-xs">XL</div>
            <span className="font-display font-bold text-sm tracking-tight">XL TRADERS</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button data-testid="mobile-menu-btn" className="p-2 border border-neutral-300 rounded-none">
                <Menu size={18} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <Brand />
              <div className="px-2 py-3">
                <NavItems onClick={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-auto">
          <Outlet />
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
