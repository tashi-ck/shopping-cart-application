import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, PackageX, CheckCheck } from "lucide-react";
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from "../api/notificationApi";

const POLL_INTERVAL_MS = 30000; // check for new alerts every 30s while the app is open

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const ref = useRef(null);

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshUnreadCount = () => {
    getUnreadCount()
      .then((res) => setUnreadCount(res.data.count))
      .catch(() => {}); // silent — this is a background poll, not a user-initiated action
  };

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening) {
      setLoading(true);
      getNotifications()
        .then((res) => setNotifications(res.data))
        .finally(() => setLoading(false));
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notification.notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    if (notification.productId) {
      setOpen(false);
      navigate(`/admin/products`);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllAsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative text-gray-500 hover:text-gray-900 transition p-1.5"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-semibold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-500 p-4">Loading...</p>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <PackageX className="mx-auto text-gray-300 mb-2" size={24} />
                <p className="text-sm text-gray-500">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.notificationId}
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition ${
                    !n.isRead ? "bg-indigo-50/40" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />}
                    <div className={n.isRead ? "pl-3.5" : ""}>
                      <p className="text-sm text-gray-800">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}