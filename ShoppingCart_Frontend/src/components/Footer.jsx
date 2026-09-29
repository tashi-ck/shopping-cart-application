import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ShoppingBag, Truck, RotateCcw, ShieldCheck, Headphones, Mail } from "lucide-react";
import { getCategories } from "../api/categoryApi";

const TRUST_ITEMS = [
  { icon: Truck, title: "Fast delivery", text: "Typically 5–7 business days" },
  { icon: RotateCcw, title: "Easy returns", text: "14-day return window" },
  { icon: ShieldCheck, title: "Secure checkout", text: "Payments handled by Stripe" },
  { icon: Headphones, title: "Here to help", text: "Ask our chat assistant anytime" },
];

const SUPPORT_LINKS = [
  { to: "/policies#shipping", label: "Shipping policy" },
  { to: "/policies#returns", label: "Returns" },
  { to: "/policies#cancellation", label: "Cancellations" },
  { to: "/policies#payment", label: "Payments" },
  { to: "/policies#guest-checkout", label: "Guest checkout" },
];

function FooterHeading({ children }) {
  return <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">{children}</h3>;
}

function FooterLink({ to, children }) {
  return (
    <li>
      <Link to={to} className="text-sm text-gray-500 hover:text-indigo-600 transition">
        {children}
      </Link>
    </li>
  );
}

export default function Footer() {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories()
      .then((res) => setCategories(res.data.slice(0, 5)))
      .catch(() => {}); // footer must never break the page
  }, []);

  return (
    <footer className="bg-white border-t border-gray-200 mt-8">
      {/* Trust strip */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {TRUST_ITEMS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                <Icon size={18} />
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Link columns */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="col-span-2 md:col-span-1">
          <Link to="/" className="flex items-center gap-2 mb-3 w-fit">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm shadow-indigo-200">
              <ShoppingBag size={16} className="text-white" />
            </span>
            <span className="text-lg font-semibold text-gray-900">Go Shopping</span>
          </Link>
          <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
            Quality products, simple ordering, and support whenever you need it.
          </p>
        </div>

        <div>
          <FooterHeading>Shop</FooterHeading>
          <ul className="space-y-2.5">
            <FooterLink to="/">All products</FooterLink>
            {categories.map((c) => (
              <FooterLink key={c.categoryId} to={`/?categoryId=${c.categoryId}`}>
                {c.name}
              </FooterLink>
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>Customer care</FooterHeading>
          <ul className="space-y-2.5">
            {SUPPORT_LINKS.map((l) => (
              <FooterLink key={l.to} to={l.to}>{l.label}</FooterLink>
            ))}
          </ul>
        </div>

        <div>
          <FooterHeading>Your account</FooterHeading>
          <ul className="space-y-2.5">
            {isAuthenticated ? (
              <>
                <FooterLink to="/orders">My orders</FooterLink>
                <FooterLink to="/profile">Profile & addresses</FooterLink>
                <FooterLink to="/cart">Cart</FooterLink>
              </>
            ) : (
              <>
                <li>
                  <button
                    type="button"
                    onClick={() => loginWithRedirect()}
                    className="text-sm text-gray-500 hover:text-indigo-600 transition"
                  >
                    Log in / Sign up
                  </button>
                </li>
                <FooterLink to="/cart">Cart</FooterLink>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Bottom bar — right padding leaves room for the floating chat button */}
      <div className="border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-5 pr-24 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Go Shopping. All rights reserved.
          </p>
          <p className="text-xs text-gray-400 flex items-center gap-1.5">
            <Mail size={12} /> Questions? Use the chat assistant in the corner.
          </p>
        </div>
      </div>
    </footer>
  );
}