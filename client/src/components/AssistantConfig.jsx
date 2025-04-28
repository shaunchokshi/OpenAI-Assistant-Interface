import React, { useState } from 'react';

export default function Config() {
  const [apiKey, setKey] = useState('');
  const [assistant, setAsst] = useState('');
  // other fields: name, instructions, model...

  const save = () => {
    localStorage.setItem('OPENAI_KEY', apiKey);
    localStorage.setItem('ASSISTANT_ID', assistant);
    alert('Saved');
  };

  return (
    <div>
      <h2>Assistant Setup</h2>
      <div>
        OpenAI Key:
        <input onChange={e => setKey(e.target.value)} />
      </div>
      <div>
        Assistant ID:
        <input onChange={e => setAsst(e.target.value)} />
      </div>
      {/* add dropdowns and inputs as specified */}
      <button onClick={save}>Save</button>
    </div>
  );
}
