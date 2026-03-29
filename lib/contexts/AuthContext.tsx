'use client';

/**
 * AuthContext - Authentication State Management
 *
 * Provides authentication state and methods to the app.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  createdAt: Date;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    refreshUser().catch(() => {
      setUser(null);
      setLoading(false);
    });
  }, []);

  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = await response.json();

      // Handle 503 Service Unavailable (app not configured)
      // Return structured error so pages can handle display (show banner vs redirect)
      if (response.status === 503) {
        const error = new Error(JSON.stringify({
          code: data.error?.code,
          message: data.error?.message,
          setupUrl: data.error?.setupUrl
        }));
        error.name = 'ConfigError';
        throw error;
      }

      throw new Error(data.error?.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
  };

  const register = async (username: string, password: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = await response.json();

      // Handle 503 Service Unavailable (app not configured)
      // Return structured error so pages can handle display (show banner vs redirect)
      if (response.status === 503) {
        const error = new Error(JSON.stringify({
          code: data.error?.code,
          message: data.error?.message,
          setupUrl: data.error?.setupUrl
        }));
        error.name = 'ConfigError';
        throw error;
      }

      throw new Error(data.error?.message || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh: refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
