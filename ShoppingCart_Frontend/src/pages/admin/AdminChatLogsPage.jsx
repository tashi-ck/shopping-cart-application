import { useEffect, useState } from "react";
import { MessageSquare, User as UserIcon } from "lucide-react";
import { getChatLogsForAdmin } from "../../api/chatApi";

export default function AdminChatLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChatLogsForAdmin(100)
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Chat Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Recent conversations with the shopping assistant, newest first.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <MessageSquare className="mx-auto text-gray-300 mb-2" size={24} />
          <p className="text-sm text-gray-500">No chat activity yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.chatLogId} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <UserIcon size={12} /> {log.userEmail ?? "Guest"}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString(undefined, {
                    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              <div className="space-y-2">
                <div className="bg-indigo-50 text-indigo-900 text-sm rounded-lg px-3 py-2 whitespace-pre-line">
                  {log.userMessage}
                </div>
                <div className="bg-gray-50 text-gray-700 text-sm rounded-lg px-3 py-2 whitespace-pre-line">
                  {log.assistantReply}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}