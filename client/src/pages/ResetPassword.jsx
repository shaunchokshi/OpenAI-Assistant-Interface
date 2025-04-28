import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/reset-password', { email });
      alert('If that email exists, a reset link has been sent.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      alert('Error sending reset. Please try again later.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <form onSubmit={handleReset} className="w-full max-w-sm bg-white p-6 rounded shadow">
        <h2 className="text-2xl mb-4">Reset Password</n        <div className="mb-4">
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mt-1 p-2 border rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Send Reset
        </button>
      </form>
    </div>
