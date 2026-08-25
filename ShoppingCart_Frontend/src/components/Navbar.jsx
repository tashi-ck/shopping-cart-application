import { useAuth0 } from "@auth0/auth0-react";
import { NavLink } from "react-router-dom";
import { useAppUser } from "../context/AppUserContext";
import { useCart } from "../context/CartContext";
import { useIsAdmin } from "../hooks/useIsAdmin";
import { Shield, ShoppingCart } from "lucide-react";

export default function Navbar() {
  const { isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const { appUser } = useAppUser();
  const { itemCount } = useCart();
  const { isAdmin } = useIsAdmin();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="text-lg font-semibold text-gray-900">Novestra Shop</span>
        <div className="flex gap-2">
          <NavLink to="/" className={linkClass} end>Products</NavLink>
          {isAuthenticated && (
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
          )}
          {isAuthenticated && <NavLink to="/orders" className={linkClass}>Orders</NavLink>}
          {isAdmin && (
            <NavLink to="/admin" className={linkClass}>
              <span className="flex items-center gap-1"><Shield size={14} /> Admin</span>
            </NavLink>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <span className="text-sm text-gray-500 hidden sm:block">{appUser?.email}</span>
            <button
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Log out
            </button>
          </>
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