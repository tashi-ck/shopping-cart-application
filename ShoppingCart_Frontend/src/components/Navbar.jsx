import { useEffect, useRef, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, ShoppingBag, Shield, User, LogOut, ChevronDown, Menu, X, Package } from "lucide-react";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const linkClass = ({ isActive }) =>
    `relative px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "text-indigo-600" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
    }`;

  const mobileLinkClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
      isActive ? "bg-indigo-50 text-indigo-600" : "text-gray-600 hover:bg-gray-50"
    }`;

  const navItems = [
    { to: "/", label: "Products", icon: Package, end: true },
    { to: "/cart", label: "Cart", icon: ShoppingCart, badge: itemCount },
    ...(isAuthenticated ? [{ to: "/orders", label: "Orders", icon: ShoppingBag }] : []),
  ];

  return (
    <nav
      className={`sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75 border-b transition-shadow ${
        scrolled ? "border-gray-200 shadow-sm" : "border-transparent"
      }`}
    >
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-4">
          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="sm:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 shrink-0"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200">
              <ShoppingBag size={16} className="text-white" />
            </span>
            <span className="text-lg font-semibold text-gray-900 hidden xs:inline">Go Shopping</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-1 ml-2">
            {navItems.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} className={linkClass} end={end}>
                <span className="flex items-center gap-1.5">
                  <Icon size={14} />
                  {label}
                  {badge > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                <span className="flex items-center gap-1.5">
                  <Shield size={14} /> Admin
                </span>
              </NavLink>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isAdmin && <NotificationBell />}

          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-full hover:bg-gray-100 transition group"
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-xs font-semibold flex items-center justify-center shadow-sm">
                  {getInitials(appUser?.firstName, appUser?.lastName, appUser?.email)}
                </span>
                <span className="text-sm text-gray-600 hidden sm:block max-w-[140px] truncate">{appUser?.email}</span>
                <ChevronDown size={14} className={`text-gray-400 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
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
              className="bg-indigo-600 text-white text-sm font-medium rounded-lg px-3.5 sm:px-4 py-2 hover:bg-indigo-700 transition shadow-sm shadow-indigo-200"
            >
              Log in
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav panel */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-100 px-4 py-3 space-y-1 bg-white">
          {navItems.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} className={mobileLinkClass} end={end} onClick={() => setMobileOpen(false)}>
              <Icon size={16} />
              {label}
              {badge > 0 && (
                <span className="ml-auto bg-indigo-600 text-white text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink to="/admin" className={mobileLinkClass} onClick={() => setMobileOpen(false)}>
              <Shield size={16} /> Admin
            </NavLink>
          )}
        </div>
      )}
    </nav>
  );
}