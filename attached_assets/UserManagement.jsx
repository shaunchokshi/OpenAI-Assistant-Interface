import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function Users() {
  const [list, setList] = useState([]);

  useEffect(() => {
    axios.get('/api/users').then(r => setList(r.data));
  }, []);

  const add = async () => {
    const em = prompt('Email');
    await axios.post('/api/users', { email: em });
    setList(l => [...l, { email: em }]);
  };

  const rm = async (id) => {
    await axios.delete(`/api/users/${id}`);
    setList(l => l.filter(u => u.id !== id));
  };

  return (
    <div>
      Users
      <button onClick={add}>Add</button>
      {list.map(u => (
        <div key={u.id || u.email}>
          {u.email}
          <button onClick={() => rm(u.id)}>Del</button>
        </div>
      ))}
    </div>
  );
}
