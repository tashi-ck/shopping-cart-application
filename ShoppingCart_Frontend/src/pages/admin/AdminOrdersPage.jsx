import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, X, ClipboardList, AlertTriangle } from "lucide-react";
import { getAllOrdersForAdmin, updateOrderFulfillmentStatus } from "../../api/orderApi";
import InlineStatusBadge from "../../components/admin/InlineStatusBadge";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import Pagination from "../../components/Pagination";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";

const PAGE_SIZE = 15;
const STATUS_TABS = ["All", "Confirmed", "Shipped", "Delivered", "Cancelled"];

const customerName = (o) =>
  [o.userFirstName, o.userLastName].filter(Boolean).join(" ") || o.userEmail;

export default function AdminOrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState("");

  const requestedStatus = searchParams.get("status");
  const status = STATUS_TABS.includes(requestedStatus) ? requestedStatus : "All";
  const urlQuery = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const [searchInput, setSearchInput] = useState(urlQuery);
  const debouncedSearch = useDebouncedValue(searchInput, 250);

  // Any change other than the page itself sends the admin back to page 1.
  const updateParams = (patch) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([key, value]) => {
          if (value === null || value === "" || value === "All") next.delete(key);
          else next.set(key, value);
        });
        if (!("page" in patch)) next.delete("page");
        return next;
      },
      { replace: true }
    );

  useEffect(() => {
    if (debouncedSearch === urlQuery) return;
    updateParams({ q: debouncedSearch.trim() || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    getAllOrdersForAdmin()
      .then((res) => setOrders(res.data))
      .catch(() => setError("Couldn't load orders."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatusChange = async (order, newStatus) => {
    if (newStatus === order.fulfillmentStatus) return;
    if (
      newStatus === "Cancelled" &&
      !window.confirm(`Cancel order #${order.orderId}? Items go back into stock and the customer is refunded.`)
    ) {
      return;
    }

    setActionError("");
    setUpdatingId(order.orderId);
    try {
      await updateOrderFulfillmentStatus(order.orderId, newStatus);
      // Refetch: cancelling also changes the payment status (Refunded), not just fulfillment.
      load(true);
    } catch (err) {
      setActionError(
        typeof err?.response?.data === "string" && err.response.data
          ? err.response.data
          : "Couldn't update this order."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const c = { All: orders.length };
    for (const o of orders) c[o.fulfillmentStatus] = (c[o.fulfillmentStatus] ?? 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const q = urlQuery.trim().toLowerCase().replace(/^#/, "");
    return orders.filter((o) => {
      if (status !== "All" && o.fulfillmentStatus !== status) return false;
      if (!q) return true;
      return (
        String(o.orderId).includes(q) ||
        customerName(o).toLowerCase().includes(q) ||
        o.userEmail.toLowerCase().includes(q)
      );
    });
  }, [orders, status, urlQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (n) => {
    updateParams({ page: n > 1 ? String(n) : null });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtering = status !== "All" || urlQuery;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading ? "Loading orders..." : `${orders.length} ${orders.length === 1 ? "order" : "orders"} across every account.`}
        </p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by order number, customer name, or email..."
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

      <div role="tablist" className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const active = status === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => updateParams({ status: tab })}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition ${
                active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
              }`}
            >
              {tab}
              {!loading && (
                <span className={`text-[11px] rounded-full px-1.5 ${active ? "bg-indigo-50 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                  {counts[tab] ?? 0}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {actionError && (
        <div role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button type="button" onClick={() => setActionError("")} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading orders...</p>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600 mb-2">{error}</p>
            <button onClick={() => load()} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto text-gray-300 mb-3" size={32} />
            <p className="text-sm font-medium text-gray-700">
              {filtering ? "No orders match" : "No orders yet"}
            </p>
            {filtering && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams({}, { replace: true });
                }}
                className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left p-3">Order</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Date</th>
                  <th className="text-left p-3">Total</th>
                  <th className="text-left p-3">Payment</th>
                  <th className="text-left p-3">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((order) => (
                  <tr
                    key={order.orderId}
                    onClick={() => navigate(`/admin/orders/${order.orderId}`)}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition"
                  >
                    <td className="p-3 font-medium text-gray-900">#{order.orderId}</td>
                    <td className="p-3">
                      <p className="text-gray-900">{customerName(order)}</p>
                      <p className="text-xs text-gray-400">{order.userEmail}</p>
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="p-3 text-gray-900 font-medium">${Number(order.totalAmount).toFixed(2)}</td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()}>
                      <InlineStatusBadge
                        value={order.fulfillmentStatus}
                        disabled={updatingId === order.orderId}
                        onChange={(newStatus) => handleStatusChange(order, newStatus)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && !error && (
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalCount={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={goToPage}
          itemLabel={filtered.length === 1 ? "order" : "orders"}
        />
      )}
    </div>
  );
}