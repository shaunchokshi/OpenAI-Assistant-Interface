import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ChatWindow({ threadId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const endRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    const res = await axios.post("/api/chat", { threadId, message: userMsg.text });
    setMessages((m) => [...m, { role: "assistant", text: res.data.text }]);
  };

  return (
    <div className="border p-4 mb-4 h-96 overflow-auto">
      {messages.map((m, i) => (
        <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
          <strong>{m.role}:</strong> {m.text}
        </div>
      ))}
      <div ref={endRef} />
      <div className="mt-2 flex">
        <input
          className="flex-1 border p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="ml-2 px-4 bg-blue-500 text-white rounded">
          Send
        </button>
      </div>
    </div>
  );
}
