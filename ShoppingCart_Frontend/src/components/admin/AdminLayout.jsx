import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Package, FolderTree, ClipboardList, Users,
  MessageSquare, ScrollText, Bot, FlaskConical, ArrowLeft, Menu, X,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/orders", label: "Orders", icon: ClipboardList },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { to: "/admin/policies", label: "Policies", icon: ScrollText },
  { to: "/admin/chat-logs", label: "Chat Logs", icon: Bot },
  { to: "/admin/chat-test", label: "Test the Bot", icon: FlaskConical },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
    isActive ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
  }`;

function SidebarLinks() {
  return (
    <>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">Admin</p>

      {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={linkClass}>
          <Icon size={16} /> {label}
        </NavLink>
      ))}

      <NavLink
        to="/"
        className="mt-auto pt-6 flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-gray-900 transition"
      >
        <ArrowLeft size={16} /> Back to store
      </NavLink>
    </>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 bg-white border-b border-gray-200 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1 -ml-1 text-gray-600 hover:text-gray-900"
          aria-label="Open admin menu"
        >
          <Menu size={20} />
        </button>
        <span className="text-sm font-semibold text-gray-900">Admin</span>
      </div>

      {/* Desktop sidebar: sticky + h-screen keeps it pinned while the page scrolls */}
      <aside className="hidden md:flex flex-col gap-1 w-56 shrink-0 sticky top-0 self-start h-screen overflow-y-auto bg-white border-r border-gray-200 p-4">
        <SidebarLinks />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl p-4 flex flex-col gap-1 overflow-y-auto"
            onClick={() => setMobileOpen(false)} // any link tap closes the drawer
          >
            <button
              type="button"
              className="self-end p-1 text-gray-400 hover:text-gray-700"
              aria-label="Close admin menu"
            >
              <X size={18} />
            </button>
            <SidebarLinks />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 p-4 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}