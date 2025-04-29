import React from "react";

export default function ThreadSelector({ threadId, setThreadId }) {
  const restart = () =>
    fetch("/api/thread/new", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setThreadId(d.threadId));

  return (
    <div className="mb-4">
      <span className="mr-2">Thread ID:</span>
      <code>{threadId}</code>
      <button onClick={restart} className="ml-4 px-2 py-1 bg-gray-200 rounded">
        New Thread
      </button>
    </div>
  );
}
