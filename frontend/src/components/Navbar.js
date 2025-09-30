import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext'; // 👈 Import the context

const Navbar = () => {
  // 👇 Use the context to get user and the logout function
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="container mx-auto p-4 flex justify-between items-center relative z-20 text-white">
      <Link to="/" className="text-2xl font-bold text-teal-400">EV Finder</Link>
      <div>
        {user ? (
          <>
            <span className="mr-4 text-slate-300">Welcome, {user.email}</span>
            <button onClick={logout} className="bg-red-500 px-4 py-2 rounded hover:bg-red-600 transition-colors">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" className="mr-4 hover:text-teal-400 transition-colors">Login</Link>
            <Link to="/register" className="bg-teal-500 px-4 py-2 rounded hover:bg-teal-600 transition-colors">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;