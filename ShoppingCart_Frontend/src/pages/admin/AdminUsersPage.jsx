import { useEffect, useState } from "react";
import { UserX, UserCheck, Trash2, ShieldAlert } from "lucide-react";
import { getAllUsersForAdmin, setUserActive, deleteUser } from "../../api/userApi";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  const load = () => {
    setLoading(true);
    getAllUsersForAdmin()
      .then((res) => setUsers(res.data))
      .catch(() => setError("Couldn't load users."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const displayName = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;

  const handleToggleActive = async (user) => {
    setTogglingId(user.userId);
    setDeleteError("");
    const newActive = !user.isActive;
    try {
      await setUserActive(user.userId, newActive);
      setUsers((prev) => prev.map((u) => (u.userId === user.userId ? { ...u, isActive: newActive } : u)));
    } catch (err) {
      setDeleteError(err.response?.data ?? "Couldn't update this account.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (userId) => {
    setDeleteError("");
    try {
      await deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
      setConfirmingDeleteId(null);
    } catch (err) {
      setDeleteError(
        err.response?.data ?? "Couldn't delete this user — they may have existing orders."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-1">Manage customer accounts.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {deleteError && (
          <div className="m-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <ShieldAlert size={15} className="mt-0.5 shrink-0" /> {deleteError}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-500 p-6">Loading users...</p>
        ) : error ? (
          <p className="text-sm text-red-600 p-6">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-gray-500 p-6">No users yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Joined</th>
                <th className="text-left p-3">Orders</th>
                <th className="text-left p-3">Status</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) =>
                confirmingDeleteId === u.userId ? (
                  <tr key={u.userId} className="border-b border-gray-100">
                    <td colSpan={5} className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-700">Permanently delete "{displayName(u)}"?</span>
                        <button
                          onClick={() => handleDelete(u.userId)}
                          className="text-xs font-medium bg-red-600 text-white rounded-lg px-3 py-1.5 hover:bg-red-700"
                        >
                          Yes, delete
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          className="text-xs font-medium text-gray-600 border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={u.userId} className={`border-b border-gray-100 last:border-0 ${!u.isActive ? "opacity-50" : ""}`}>
                    <td className="p-3">
                      <p className="font-medium text-gray-900">{displayName(u)}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(u.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                    </td>
                    <td className="p-3 text-gray-700">{u.orderCount}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                      }`}>
                        {u.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => handleToggleActive(u)}
                          disabled={togglingId === u.userId}
                          title={u.isActive ? "Deactivate account" : "Reactivate account"}
                          className="text-gray-400 hover:text-amber-600 disabled:opacity-40"
                        >
                          {u.isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(u.userId)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}