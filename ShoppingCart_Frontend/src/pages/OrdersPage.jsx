import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PackageSearch, XCircle, Search, X, ShoppingBag, ChevronRight } from "lucide-react";
import { getOrders, cancelOrder } from "../api/orderApi";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import { fulfillmentStatusStyles } from "../utils/statusStyles";

const money = (n) => `$${Number(n ?? 0).toFixed(2)}`;

const TABS = [
  { key: "all", label: "All", match: () => true },
  { key: "active", label: "Active", match: (o) => o.fulfillmentStatus === "Confirmed" || o.fulfillmentStatus === "Shipped" },
  { key: "delivered", label: "Delivered", match: (o) => o.fulfillmentStatus === "Delivered" },
  { key: "cancelled", label: "Cancelled", match: (o) => o.fulfillmentStatus === "Cancelled" },
];

const MAX_THUMBS = 3;

function useDebouncedValue(value, delayMs) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function Thumbnails({ items }) {
  const shown = items.slice(0, MAX_THUMBS);
  const extra = items.length - shown.length;

  return (
    <div className="flex items-center gap-1.5">
      {shown.map((item) => (
        <div
          key={item.orderItemId}
          className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0"
          title={item.productName}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.productName} loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <ShoppingBag size={16} className="text-gray-300" />
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-medium text-gray-500 shrink-0">
          +{extra}
        </div>
      )}
    </div>
  );
}

function OrderCard({ order, confirming, cancelling, cancelError, onAskCancel, onDismissCancel, onConfirmCancel }) {
  const first = order.items[0];
  const others = order.items.length - 1;
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const refunded = order.paymentStatus === "Refunded";
  const cancelled = order.fulfillmentStatus === "Cancelled";

  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      to={`/orders/${order.orderId}`}
      className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Order #{order.orderId}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${
              fulfillmentStatusStyles[order.fulfillmentStatus] ?? "bg-gray-100 text-gray-700"
            }`}
          >
            {order.fulfillmentStatus}
          </span>
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Thumbnails items={order.items} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">{first?.productName ?? "No items"}</p>
          <p className="text-xs text-gray-400">
            {others > 0 ? `and ${others} more · ` : ""}
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-semibold text-gray-900">{money(order.totalAmount)}</p>
          <ChevronRight size={16} className="text-gray-300 ml-auto mt-0.5" />
        </div>
      </div>

      {cancelled && refunded && (
        <p className="text-xs text-gray-400 mt-3">Refunded to your original payment method.</p>
      )}

      {order.fulfillmentStatus === "Confirmed" && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {confirming ? (
            <div onClick={stop}>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Cancel this order?</span>
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    onConfirmCancel();
                  }}
                  disabled={cancelling}
                  className="text-xs font-medium bg-red-600 text-white rounded-lg px-2.5 py-1 hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelling ? "Cancelling..." : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    stop(e);
                    onDismissCancel();
                  }}
                  disabled={cancelling}
                  className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-2.5 py-1 hover:bg-gray-50"
                >
                  No
                </button>
              </div>
              {cancelError && <p className="text-xs text-red-600 mt-2">{cancelError}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                onAskCancel();
              }}
              className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700"
            >
              <XCircle size={13} /> Cancel order
            </button>
          )}
        </div>
      )}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex justify-between mb-4">
            <div className="h-4 bg-gray-100 rounded w-28" />
            <div className="h-5 bg-gray-100 rounded-full w-20" />
          </div>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((__, j) => (
              <div key={j} className="w-12 h-12 bg-gray-100 rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmingCancelId, setConfirmingCancelId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancelErrors, setCancelErrors] = useState({});

  const requestedTab = searchParams.get("status");
  const activeTab = TABS.some((t) => t.key === requestedTab) ? requestedTab : "all";
  const urlQuery = searchParams.get("q") ?? "";

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  const updateParams = (patch) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === null || value === "" || value === "all") next.delete(key);
          else next.set(key, value);
        });
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    if (debouncedSearch === urlQuery) return;
    updateParams({ q: debouncedSearch.trim() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const load = () => {
    setLoading(true);
    setError("");
    getOrders()
      .then((res) => setOrders(res.data))
      .catch(() => setError("Couldn't load your orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCancel = async (orderId) => {
    setCancellingId(orderId);
    setCancelErrors((prev) => ({ ...prev, [orderId]: "" }));
    try {
      const res = await cancelOrder(orderId);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, fulfillmentStatus: res.data.fulfillmentStatus, paymentStatus: res.data.paymentStatus }
            : o
        )
      );
      setConfirmingCancelId(null);
    } catch (err) {
      const message =
        typeof err?.response?.data === "string" && err.response.data ? err.response.data : "Couldn't cancel this order.";
      setCancelErrors((prev) => ({ ...prev, [orderId]: message }));
    } finally {
      setCancellingId(null);
    }
  };

  const tabCounts = useMemo(
    () => Object.fromEntries(TABS.map((t) => [t.key, orders.filter(t.match).length])),
    [orders]
  );

  const visibleOrders = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    const q = urlQuery.trim().toLowerCase().replace(/^#/, "");

    return orders.filter((o) => {
      if (!tab.match(o)) return false;
      if (!q) return true;
      return (
        String(o.orderId).includes(q) ||
        o.items.some((i) => i.productName.toLowerCase().includes(q))
      );
    });
  }, [orders, activeTab, urlQuery]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-xl">
        <p className="text-sm text-red-600 mb-2">{error}</p>
        <button onClick={load} className="text-sm font-medium text-red-700 underline">Try again</button>
      </div>
    );
  }

  if (!loading && orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center max-w-xl mx-auto">
        <PackageSearch className="mx-auto text-gray-300 mb-3" size={36} />
        <p className="text-sm font-medium text-gray-700">No orders yet</p>
        <p className="text-sm text-gray-400 mt-1 mb-5">When you place an order, it will show up here.</p>
        <Link
          to="/"
          className="inline-block text-sm font-medium bg-indigo-600 text-white rounded-lg px-5 py-2.5 hover:bg-indigo-700 transition"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const filtering = activeTab !== "all" || urlQuery;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Your Orders</h1>
      <p className="text-sm text-gray-500 mb-5">
        {loading ? "Loading..." : `${orders.length} ${orders.length === 1 ? "order" : "orders"} in total`}
      </p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by order number or product..."
          className="w-full rounded-full border border-gray-200 bg-white pl-10 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => setSearchInput("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div role="tablist" className="flex gap-1 border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => updateParams({ status: tab.key })}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
                active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {!loading && (
                <span className={`text-[11px] rounded-full px-1.5 ${active ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                  {tabCounts[tab.key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <ListSkeleton />
      ) : visibleOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <PackageSearch className="mx-auto text-gray-300 mb-3" size={30} />
          <p className="text-sm font-medium text-gray-700">No orders match</p>
          <p className="text-sm text-gray-400 mt-1">
            {urlQuery ? `Nothing found for "${urlQuery}".` : "There are no orders with this status."}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearchParams({}, { replace: true });
              }}
              className="mt-4 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.orderId}
              order={order}
              confirming={confirmingCancelId === order.orderId}
              cancelling={cancellingId === order.orderId}
              cancelError={cancelErrors[order.orderId]}
              onAskCancel={() => {
                setCancelErrors((prev) => ({ ...prev, [order.orderId]: "" }));
                setConfirmingCancelId(order.orderId);
              }}
              onDismissCancel={() => setConfirmingCancelId(null)}
              onConfirmCancel={() => handleCancel(order.orderId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}