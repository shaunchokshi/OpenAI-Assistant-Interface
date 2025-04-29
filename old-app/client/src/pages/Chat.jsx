// project-root/client/src/pages/Chat.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ThreadSelector from '../components/ThreadSelector';
import ChatWindow   from '../components/ChatWindow';
import FileUploader from '../components/FileUploader';

export default function Chat() {
  const [threadId, setThreadId] = useState('');

  useEffect(() => {
    axios.post('/api/thread/new')
      .then(res => setThreadId(res.data.threadId))
      .catch(console.error);
  }, []);

  if (!threadId) return <div>Loading conversation…</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Assistant Conversation</h1>
      <ThreadSelector threadId={threadId} setThreadId={setThreadId} />
      <ChatWindow    threadId={threadId} />
      <FileUploader />
    </div>
  );
}
