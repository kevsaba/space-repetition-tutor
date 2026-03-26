'use client';

/**
 * SettingsForm Component
 *
 * Allows authenticated users to update:
 * - Database configuration
 * - LLM configuration
 * - Password
 */

import { useState, useEffect } from 'react';
import {
  Database,
  Key,
  Lock,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ConfigData {
  database: {
    url: string;
    directUrl: string;
  };
  llm: {
    apiUrl: string;
    apiKey: string;
    model: string;
  };
  setupCompletedAt: string | null;
}

interface FormErrors {
  databaseUrl?: string;
  directUrl?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  general?: string;
}

type Tab = 'database' | 'llm' | 'password';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'database', label: 'Database', icon: <Database className="w-4 h-4" /> },
  { id: 'llm', label: 'LLM Settings', icon: <Key className="w-4 h-4" /> },
  { id: 'password', label: 'Security', icon: <Lock className="w-4 h-4" /> },
];

export function SettingsForm() {
  const [activeTab, setActiveTab] = useState<Tab>('database');
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Database form state
  const [databaseForm, setDatabaseForm] = useState({
    url: '',
    directUrl: '',
  });

  // LLM form state
  const [llmForm, setLlmForm] = useState({
    apiUrl: '',
    apiKey: '',
    model: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Show password states
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    apiKey: false,
  });

  // Fetch current config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/settings/config');
      if (!response.ok) {
        throw new Error('Failed to fetch config');
      }
      const data = await response.json();
      setConfig(data);

      // Pre-fill forms (but keep masked values as placeholder for LLM API key)
      setDatabaseForm({
        url: data.database.url || '',
        directUrl: data.database.directUrl || '',
      });
      setLlmForm({
        apiUrl: data.llm.apiUrl || '',
        apiKey: '', // Don't pre-fill masked API key
        model: data.llm.model || '',
      });
    } catch (err) {
      console.error('Failed to fetch config:', err);
      setErrors({ general: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validate
    const newErrors: FormErrors = {};
    if (!databaseForm.url.trim()) {
      newErrors.databaseUrl = 'Database URL is required';
    } else if (!databaseForm.url.startsWith('postgresql://')) {
      newErrors.databaseUrl = 'Must start with postgresql://';
    }
    if (!databaseForm.directUrl.trim()) {
      newErrors.directUrl = 'Direct URL is required';
    } else if (!databaseForm.directUrl.startsWith('postgresql://')) {
      newErrors.directUrl = 'Must start with postgresql://';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await saveConfig({ database: databaseForm });
  };

  const handleLlmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validate
    const newErrors: FormErrors = {};
    if (!llmForm.apiUrl.trim()) {
      newErrors.apiUrl = 'API URL is required';
    }
    if (!llmForm.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    } else if (llmForm.apiKey.length < 10) {
      newErrors.apiKey = 'API Key appears to be invalid';
    }
    if (!llmForm.model.trim()) {
      newErrors.model = 'Model is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await saveConfig({ llm: llmForm });
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');

    // Validate
    const newErrors: FormErrors = {};
    if (!passwordForm.currentPassword.trim()) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordForm.newPassword.trim()) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (!passwordForm.confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to update password');
      }

      // Clear form and show success
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setSuccessMessage('Password updated successfully');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to update password',
      });
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (updates: Partial<ConfigData>) => {
    setSaving(true);

    try {
      const response = await fetch('/api/settings/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save settings');
      }

      setSuccessMessage('Settings saved successfully');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Refresh config
      await fetchConfig();
    } catch (err) {
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to save settings',
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleShowPassword = (field: keyof typeof showPasswords) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setErrors({});
                setSuccessMessage('');
              }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5" />
          {successMessage}
        </div>
      )}

      {/* General Error */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {errors.general}
        </div>
      )}

      {/* Database Settings */}
      {activeTab === 'database' && (
        <form onSubmit={handleDatabaseSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Database Configuration</h3>
            <p className="text-sm text-gray-600 mb-6">
              Update your database connection strings. Changes will take effect after saving.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Database Connection String
              </label>
              <input
                type="text"
                value={databaseForm.url}
                onChange={(e) => setDatabaseForm({ ...databaseForm, url: e.target.value })}
                placeholder="postgresql://postgres:password@localhost:5432/db"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                  errors.databaseUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.databaseUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.databaseUrl}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Include connection pooling parameters if using Supabase
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direct Connection String
              </label>
              <input
                type="text"
                value={databaseForm.directUrl}
                onChange={(e) => setDatabaseForm({ ...databaseForm, directUrl: e.target.value })}
                placeholder="postgresql://postgres:password@localhost:5432/db"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                  errors.directUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.directUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.directUrl}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Used for database migrations
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Database Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* LLM Settings */}
      {activeTab === 'llm' && (
        <form onSubmit={handleLlmSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">LLM Provider Configuration</h3>
            <p className="text-sm text-gray-600 mb-6">
              Update your LLM provider settings. Leave API Key empty to keep current value.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Endpoint URL
              </label>
              <input
                type="text"
                value={llmForm.apiUrl}
                onChange={(e) => setLlmForm({ ...llmForm, apiUrl: e.target.value })}
                placeholder="https://api.openai.com/v1"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                  errors.apiUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.apiUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.apiUrl}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showPasswords.apiKey ? 'text' : 'password'}
                  value={llmForm.apiKey}
                  onChange={(e) => setLlmForm({ ...llmForm, apiKey: e.target.value })}
                  placeholder="Enter new API key or leave empty to keep current"
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                    errors.apiKey ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('apiKey')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.apiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.apiKey && (
                <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to keep the current API key
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={llmForm.model}
                onChange={(e) => setLlmForm({ ...llmForm, model: e.target.value })}
                placeholder="gpt-4o-mini"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                  errors.model ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.model && (
                <p className="mt-1 text-sm text-red-600">{errors.model}</p>
              )}
            </div>

            {/* Quick presets */}
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Popular Providers:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLlmForm({ ...llmForm, apiUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' })}
                  className="text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  <div className="font-medium text-gray-900">OpenAI</div>
                  <div className="text-xs text-gray-500">gpt-4o-mini</div>
                </button>
                <button
                  type="button"
                  onClick={() => setLlmForm({ ...llmForm, apiUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-8b' })}
                  className="text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  <div className="font-medium text-gray-900">Groq</div>
                  <div className="text-xs text-gray-500">Free tier available</div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save LLM Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Password Settings */}
      {activeTab === 'password' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
            <p className="text-sm text-gray-600 mb-6">
              Update your account password. You will need to enter your current password to make changes.
            </p>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.currentPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('current')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.newPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters long
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => toggleShowPassword('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
