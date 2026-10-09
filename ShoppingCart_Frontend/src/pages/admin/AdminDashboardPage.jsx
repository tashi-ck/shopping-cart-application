import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign, ShoppingBag, Users, Boxes, TrendingUp, TrendingDown, RefreshCw,
  AlertTriangle, MessageSquare, Bot, Truck, PackageX, ImageOff, CheckCircle2,
} from "lucide-react";
import { getDashboard } from "../../api/dashboardApi";
import PaymentStatusBadge from "../../components/PaymentStatusBadge";
import { fulfillmentStatusStyles } from "../../utils/statusStyles";

const money = (n) =>
  `$${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Percent change vs the previous period. null when there's no baseline to compare to.
function percentChange(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function Trend({ change }) {
  if (change === null || change === undefined) {
    return <span className="text-xs text-gray-400">No prior data</span>;
  }
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${up ? "text-green-600" : "text-red-600"}`}>
      <Icon size={13} /> {up ? "+" : ""}{change.toFixed(1)}%
      <span className="text-gray-400 font-normal">vs previous 30 days</span>
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, iconClasses }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        <span className={`flex items-center justify-center w-9 h-9 rounded-xl ${iconClasses}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <div className="mt-1.5 min-h-[1rem]">{sub}</div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 0);
  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  const formatDay = (iso) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

  return (
    <div>
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-semibold text-gray-900">{money(total)}</span>
        <span className="text-xs text-gray-400">last 30 days</span>
      </div>

      {max === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-gray-400">
          No paid orders in the last 30 days.
        </div>
      ) : (
        <>
          <div className="h-40 flex items-end gap-1">
            {data.map((d) => {
              const heightPct = (d.revenue / max) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 h-full flex items-end group relative"
                  title={`${formatDay(d.date)} — ${money(d.revenue)} (${d.orders} ${d.orders === 1 ? "order" : "orders"})`}
                >
                  <div
                    className={`w-full rounded-t transition ${
                      d.revenue > 0 ? "bg-indigo-500 group-hover:bg-indigo-700" : "bg-gray-100"
                    }`}
                    style={{ height: `${Math.max(heightPct, d.revenue > 0 ? 3 : 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-gray-400">
            <span>{formatDay(data[0].date)}</span>
            <span>{formatDay(data[Math.floor(data.length / 2)].date)}</span>
            <span>{formatDay(data[data.length - 1].date)}</span>
          </div>
        </>
      )}
    </div>
  );
}

const STATUS_BAR_COLORS = {
  Confirmed: "bg-blue-500",
  Shipped: "bg-amber-500",
  Delivered: "bg-green-500",
  Cancelled: "bg-red-400",
};
const STATUS_ORDER = ["Confirmed", "Shipped", "Delivered", "Cancelled"];

function StatusBreakdown({ data }) {
  const total = data.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return <p className="text-sm text-gray-400">No orders yet.</p>;

  const sorted = [...data].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="space-y-3">
      {sorted.map((s) => (
        <div key={s.status}>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700">{s.status}</span>
            <span className="text-gray-500">{s.count} · {Math.round((s.count / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${STATUS_BAR_COLORS[s.status] ?? "bg-gray-400"}`}
              style={{ width: `${(s.count / total) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function AttentionItem({ to, icon: Icon, count, label, tone }) {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <Link to={to} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition">
      <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${tones[tone]}`}>
        <Icon size={16} />
      </span>
      <span className="flex-1 text-sm text-gray-700">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{count}</span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-100 rounded w-48" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-gray-100 rounded-2xl" />
        <div className="h-72 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    getDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError("Couldn't load the dashboard."))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
        <p className="text-sm text-red-600 mb-3">{error || "Something went wrong."}</p>
        <button onClick={() => load()} className="text-sm font-medium text-red-700 underline">Try again</button>
      </div>
    );
  }

  const { summary, revenueByDay, ordersByStatus, topProducts, recentOrders, lowStock } = data;

  const needsAttention =
    summary.pendingFulfillment > 0 || summary.pendingReviews > 0 || summary.lowStockCount > 0 || summary.chatNotHelpful > 0;

  const chatRated = summary.chatHelpful + summary.chatNotHelpful;
  const chatHelpfulPct = chatRated > 0 ? Math.round((summary.chatHelpful / chatRated) * 100) : null;

  const customerName = (o) =>
    [o.customerFirstName, o.customerLastName].filter(Boolean).join(" ") || o.customerEmail;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">How the store is doing right now.</p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50 transition"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={DollarSign}
          label="Revenue (30 days)"
          value={money(summary.revenueLast30Days)}
          iconClasses="bg-green-50 text-green-600"
          sub={<Trend change={percentChange(summary.revenueLast30Days, summary.revenuePrev30Days)} />}
        />
        <StatCard
          icon={ShoppingBag}
          label="Orders (30 days)"
          value={summary.ordersLast30Days}
          iconClasses="bg-indigo-50 text-indigo-600"
          sub={<Trend change={percentChange(summary.ordersLast30Days, summary.ordersPrev30Days)} />}
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={summary.totalCustomers}
          iconClasses="bg-violet-50 text-violet-600"
          sub={
            <span className="text-xs text-gray-500">
              +{summary.newCustomersLast30Days} in the last 30 days
            </span>
          }
        />
        <StatCard
          icon={Boxes}
          label="Inventory value"
          value={money(summary.inventoryValue)}
          iconClasses="bg-amber-50 text-amber-600"
          sub={
            <span className="text-xs text-gray-500">
              {summary.activeProducts} active products · {summary.totalCategories} categories
            </span>
          }
        />
      </div>

      {/* Chart + attention */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Panel title="Revenue">
            <RevenueChart data={revenueByDay} />
          </Panel>
        </div>

        <Panel title="Needs attention">
          {needsAttention ? (
            <div className="space-y-2">
              {summary.pendingFulfillment > 0 && (
                <AttentionItem to="/admin/orders" icon={Truck} tone="blue"
                  count={summary.pendingFulfillment} label="Orders awaiting fulfillment" />
              )}
              {summary.pendingReviews > 0 && (
                <AttentionItem to="/admin/reviews" icon={MessageSquare} tone="amber"
                  count={summary.pendingReviews} label="Reviews awaiting moderation" />
              )}
              {summary.lowStockCount > 0 && (
                <AttentionItem to="/admin/products" icon={AlertTriangle} tone="red"
                  count={summary.lowStockCount} label="Products low on stock" />
              )}
              {summary.chatNotHelpful > 0 && (
                <AttentionItem to="/admin/chat-logs" icon={Bot} tone="amber"
                  count={summary.chatNotHelpful} label="Chatbot replies marked not helpful" />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="text-green-500 mb-2" size={28} />
              <p className="text-sm font-medium text-gray-700">All caught up</p>
              <p className="text-xs text-gray-400 mt-0.5">Nothing needs your attention.</p>
            </div>
          )}

          {chatHelpfulPct !== null && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-gray-700">Chatbot satisfaction</span>
                <span className="text-gray-500">{chatHelpfulPct}% of {chatRated} rated</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${chatHelpfulPct}%` }} />
              </div>
            </div>
          )}
        </Panel>
      </div>

      {/* Status + top products + low stock */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Panel title="Orders by status">
          <StatusBreakdown data={ordersByStatus} />
          <p className="text-xs text-gray-400 mt-4">{summary.totalOrders} orders all time</p>
        </Panel>

        <Panel title="Top selling products">
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-semibold text-gray-400">{i + 1}</span>
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <ImageOff size={13} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.unitsSold} sold</p>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{money(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel
          title="Low stock"
          action={
            lowStock.length > 0 && (
              <Link to="/admin/products" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                Manage
              </Link>
            )
          }
        >
          {lowStock.length === 0 ? (
            <div className="flex flex-col items-center py-6 text-center">
              <PackageX className="text-gray-300 mb-2" size={24} />
              <p className="text-sm text-gray-400">Every product is well stocked.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStock.map((p) => (
                <div key={p.productId} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-700 truncate pr-3">{p.name}</span>
                  <span className={`text-xs font-semibold shrink-0 ${p.stockQuantity === 0 ? "text-red-600" : "text-amber-600"}`}>
                    {p.stockQuantity === 0 ? "Out of stock" : `${p.stockQuantity} left`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent orders */}
      <Panel
        title="Recent orders"
        action={
          <Link to="/admin/orders" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
            View all
          </Link>
        }
      >
        {recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-400 uppercase tracking-wide">
                <tr>
                  <th className="text-left font-medium px-2 py-2">Order</th>
                  <th className="text-left font-medium px-2 py-2">Customer</th>
                  <th className="text-left font-medium px-2 py-2">Date</th>
                  <th className="text-left font-medium px-2 py-2">Total</th>
                  <th className="text-left font-medium px-2 py-2">Payment</th>
                  <th className="text-left font-medium px-2 py-2">Fulfillment</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o) => (
                  <tr key={o.orderId} className="border-t border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-2 py-2.5">
                      <Link to={`/admin/orders/${o.orderId}`} className="font-medium text-indigo-600 hover:text-indigo-700">
                        #{o.orderId}
                      </Link>
                    </td>
                    <td className="px-2 py-2.5 text-gray-700">{customerName(o)}</td>
                    <td className="px-2 py-2.5 text-gray-500">
                      {new Date(o.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-2 py-2.5 font-medium text-gray-900">{money(o.totalAmount)}</td>
                    <td className="px-2 py-2.5"><PaymentStatusBadge status={o.paymentStatus} /></td>
                    <td className="px-2 py-2.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${fulfillmentStatusStyles[o.fulfillmentStatus] ?? "bg-gray-100 text-gray-700"}`}>
                        {o.fulfillmentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}