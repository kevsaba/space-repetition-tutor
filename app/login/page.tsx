'use client';

/**
 * Login Page
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SetupRequiredBanner } from '@/components/SetupRequiredBanner';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  // Check if app is configured on mount
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/setup/check', { cache: 'no-store' });
        const data = await response.json();
        setConfigured(data.configured);
      } catch {
        // If check fails, assume configured (don't block login on network errors)
        setConfigured(true);
      }
    };

    checkConfig();
  }, []);

  // Handle API errors that indicate database needs setup
  const handleApiError = (err: unknown) => {
    if (err instanceof Error) {
      // Try to parse JSON error response
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.error?.code === 'DATABASE_NOT_READY') {
          setConfigured(false);
          setError(errorData.error.message || 'Database setup required');
          return;
        }
      } catch {
        // Not a JSON response, use the message directly
      }

      // Check for database-related error messages
      if (err.message.includes('does not exist') || err.message.includes('table')) {
        setConfigured(false);
        setError('Database tables not found. Please complete the database setup.');
        return;
      }
    }
    throw err;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      router.push('/study');
    } catch (err) {
      handleApiError(err);
      const message = err instanceof Error ? err.message : 'Login failed';
      // Don't show error if it's a config redirect (the redirect handles it)
      if (!message.includes('Setup required') && !message.includes('not configured') && configured !== false) {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Show banner if app is not configured */}
        {configured === false && (
          <SetupRequiredBanner message="Please complete the setup process before logging in." />
        )}

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-center mb-6">Welcome Back</h1>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={configured === false}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={configured === false}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || configured === false}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/signup" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Sign up
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-800">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
