import React, { useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext'; // 👈 Import the context

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useContext(AuthContext); // 👈 Get the login function

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    login(email, password); // 👈 Call the login function
  };

  return (
    <div className="container mx-auto max-w-md text-white pt-20 relative z-10">
      <h2 className="text-4xl font-bold text-center text-teal-400 mb-8">Login</h2>
      <form onSubmit={handleSubmit} className="bg-slate-800/60 p-8 rounded-xl shadow-lg border border-slate-700 space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-400 mb-1">Email</label>
          <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-slate-700 border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-400 mb-1">Password</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-slate-700 border-slate-600 rounded-md p-3 focus:ring-2 focus:ring-cyan-500 outline-none transition" />
        </div>
        <button type="submit" className="w-full px-6 py-3 font-semibold rounded-md text-white bg-gradient-to-r from-teal-500 to-cyan-600 hover:opacity-90 transition-opacity">Login</button>
        <p className="text-center text-slate-400">
          New here? <Link to="/register" className="text-teal-400 hover:underline">Register now</Link>
        </p>
      </form>
    </div>
  );
};

export default LoginPage;