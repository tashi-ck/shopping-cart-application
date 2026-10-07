import { useEffect, useState } from "react";
import { MessageSquare, User as UserIcon, ThumbsUp, ThumbsDown } from "lucide-react";
import { getChatLogsForAdmin } from "../../api/chatApi";

function FeedbackBadge({ feedback }) {
  if (feedback === null || feedback === undefined) {
    return <span className="text-[11px] text-gray-300">No feedback</span>;
  }
  return feedback ? (
    <span className="flex items-center gap-1 text-[11px] font-medium text-green-700">
      <ThumbsUp size={11} /> Helpful
    </span>
  ) : (
    <span className="flex items-center gap-1 text-[11px] font-medium text-red-600">
      <ThumbsDown size={11} /> Not helpful
    </span>
  );
}

export default function AdminChatLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getChatLogsForAdmin(100)
      .then((res) => setLogs(res.data))
      .finally(() => setLoading(false));
  }, []);

  const helpfulCount = logs.filter((l) => l.feedback === true).length;
  const notHelpfulCount = logs.filter((l) => l.feedback === false).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Chat Logs</h1>
        <p className="text-sm text-gray-500 mt-1">
          Recent conversations with the shopping assistant, newest first.
        </p>
      </div>

      {!loading && logs.length > 0 && (
        <div className="flex gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-2">
            <ThumbsUp size={15} className="text-green-600" />
            <span className="text-sm font-medium text-gray-900">{helpfulCount}</span>
            <span className="text-xs text-gray-400">helpful</span>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 flex items-center gap-2">
            <ThumbsDown size={15} className="text-red-600" />
            <span className="text-sm font-medium text-gray-900">{notHelpfulCount}</span>
            <span className="text-xs text-gray-400">not helpful</span>
          </div>
        </div>
      )}

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
                <div className="flex items-center gap-3">
                  <FeedbackBadge feedback={log.feedback} />
                  <span className="text-xs text-gray-400">
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
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