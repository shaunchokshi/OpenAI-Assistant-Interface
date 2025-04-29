import React, { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ChatWindow({ threadId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef();
  const inputRef = useRef();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Focus the input field when the component mounts
    inputRef.current?.focus();
  }, []);

  const send = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { role: "user", text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.post("/api/chat", { threadId, message: userMsg.text });
      setMessages((m) => [...m, { role: "assistant", text: res.data.text }]);
    } catch (err) {
      console.error("Chat error:", err);
      setError(
        err.response?.data?.error || 
        "Failed to communicate with the assistant. Please try again."
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="border rounded p-4 mb-4 flex flex-col h-96">
      <div className="flex-grow overflow-auto mb-4">
        {messages.length === 0 ? (
          <div className="text-gray-500 text-center mt-20">
            Send a message to start chatting with the assistant
          </div>
        ) : (
          messages.map((m, i) => (
            <div 
              key={i} 
              className={`mb-3 p-3 rounded max-w-[80%] ${
                m.role === "user" 
                  ? "bg-blue-100 ml-auto" 
                  : "bg-gray-100"
              }`}
            >
              <div className="font-bold text-xs text-gray-500 mb-1">
                {m.role === "user" ? "You" : "Assistant"}
              </div>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          ))
        )}
        {error && (
          <div className="bg-red-100 text-red-700 p-2 rounded mb-2">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center p-2">
            <div className="animate-pulse text-gray-500">
              Assistant is thinking...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      
      <div className="flex">
        <input
          ref={inputRef}
          className="flex-grow border p-2 rounded-l"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your message here..."
          disabled={loading}
        />
        <button 
          onClick={send} 
          className={`px-4 py-2 bg-blue-500 text-white rounded-r ${
            loading || !input.trim() 
              ? "opacity-50 cursor-not-allowed" 
              : "hover:bg-blue-600"
          }`}
          disabled={loading || !input.trim()}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}