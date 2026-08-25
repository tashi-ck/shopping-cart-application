import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Package, FolderTree, ArrowLeft } from "lucide-react";
import { ClipboardList } from "lucide-react";
import { Users } from "lucide-react";

export default function AdminLayout() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-3 mb-2">Admin</p>
        <NavLink to="/admin" end className={linkClass}>
          <LayoutDashboard size={16} /> Dashboard
        </NavLink>
        <NavLink to="/admin/products" className={linkClass}>
          <Package size={16} /> Products
        </NavLink>
        <NavLink to="/admin/categories" className={linkClass}>
          <FolderTree size={16} /> Categories
        </NavLink>
        <NavLink to="/admin/orders" className={linkClass}>
          <ClipboardList size={16} /> Orders
        </NavLink>
        <NavLink to="/admin/users" className={linkClass}>
           <Users size={16} /> Users
        </NavLink>

        <NavLink to="/" className="flex items-center gap-2 px-3 py-2 mt-6 text-sm text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft size={16} /> Back to store
        </NavLink>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}