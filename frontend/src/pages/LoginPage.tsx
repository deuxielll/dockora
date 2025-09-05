import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, Navigate } from 'react-router-dom';
import { getSmtpStatus } from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const { login, needsSetup } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!needsSetup) {
      const checkSmtp = async () => {
        try {
          const res = await getSmtpStatus();
          setIsSmtpConfigured(res.data.configured);
        } catch (err) {
          console.error("Failed to check SMTP status", err);
        }
      };
      checkSmtp();
    }
  }, [needsSetup]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (needsSetup) {
    return <Navigate to="/setup" replace />;
  }

  const inputStyles = "w-full p-3 bg-dark-bg text-gray-300 rounded-lg shadow-neo-inset focus:outline-none transition placeholder:text-gray-500";
  const buttonStyles = "w-full px-6 py-3 bg-dark-bg text-accent rounded-lg shadow-neo active:shadow-neo-inset transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-dark-bg shadow-neo rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-center text-gray-200 mb-8">🐳 Dockora</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-400">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyles}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="mb-2">
            <label htmlFor="password" className="block text-sm font-medium mb-2 text-gray-400">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyles}
              placeholder="Enter your password"
              required
            />
          </div>
          <div className="text-right mb-6 h-5">
            {isSmtpConfigured && (
              <Link to="/forgot-password" className="text-sm text-accent hover:underline">Forgot Password?</Link>
            )}
          </div>
          
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

          <button type="submit" className={buttonStyles} disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;