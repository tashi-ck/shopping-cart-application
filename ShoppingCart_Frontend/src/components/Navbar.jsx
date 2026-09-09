import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, Shield, User, LogOut, ChevronDown } from "lucide-react";
import { useAppUser } from "../context/AppUserContext";
import { useCart } from "../context/CartContext";
import { useIsAdmin } from "../hooks/useIsAdmin";
import NotificationBell from "./NotificationBell";
import { getInitials } from "../utils/avatar";

export default function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const { appUser } = useAppUser();
  const { itemCount } = useCart();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-gray-900">Go Shopping</span>
        <div className="flex gap-2">
          <NavLink to="/" className={linkClass} end>Products</NavLink>
          
            <NavLink to="/cart" className={linkClass}>
              <span className="flex items-center gap-1.5">
                <ShoppingCart size={14} />
                Cart
                {itemCount > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </span>
            </NavLink>
          
          {isAuthenticated && <NavLink to="/orders" className={linkClass}>Orders</NavLink>}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <span className="flex items-center gap-1"><Shield size={14} /> Admin</span>
            </NavLink>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isAdmin && <NotificationBell />}

        {isAuthenticated ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 transition group"
            >
              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center group-hover:bg-indigo-200 transition">
                {getInitials(appUser?.firstName, appUser?.lastName, appUser?.email)}
              </span>
              <span className="text-sm text-gray-600 hidden sm:block">{appUser?.email}</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">{appUser?.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/profile");
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  <User size={15} /> Profile
                </button>
                <button
                  type="button"
                  onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => loginWithRedirect()}
            className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2 hover:bg-indigo-700 transition"
          >
            Log in
          </button>
        )}
      </div>
    </nav>
  );
}