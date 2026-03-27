'use client';

/**
 * LLMSettingsForm Component
 *
 * Form for managing per-user LLM configuration:
 * - Storage preference radio buttons (Session / Database)
 * Disclaimer about each option
 * - API URL input (placeholder, clears on focus)
 * - API Key input (password with show/hide toggle)
 * - Model input
 * - Quick presets (OpenAI, Groq)
 * - Save button with loading state
 * - Success/error messages
 */

import { useState, useEffect } from 'react';
import {
  Key,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Database,
  Clock,
  Lock as LockIcon,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { StoragePreference } from '@prisma/client';

interface LLMConfig {
  storagePreference: StoragePreference;
  apiUrl: string;
  apiKey: string;
  model: string;
  currentPassword?: string; // Required when saving with DATABASE storage
}

interface FormErrors {
  apiUrl?: string;
  apiKey?: string;
  model?: string;
  currentPassword?: string;
  general?: string;
}

interface LLMSettingsFormProps {
  onSuccess?: () => void;
}

const STORAGE_OPTIONS: Array<{
  value: StoragePreference;
  label: string;
  icon: React.ReactNode;
  description: string;
  disclaimer: string;
}> = [
  {
    value: StoragePreference.SESSION,
    label: 'Session Only',
    icon: <Clock className="w-5 h-5" />,
    description: 'Stored temporarily in browser memory',
    disclaimer: 'Your credentials will be cleared when you close the browser. You will need to re-enter them next time.',
  },
  {
    value: StoragePreference.DATABASE,
    label: 'Encrypted Storage',
    icon: <LockIcon className="w-5 h-5" />,
    description: 'Encrypted with your password and stored securely',
    disclaimer: 'Your credentials are encrypted with your password and stored in the database. Requires your current password to save.',
  },
];

const PRESETS: Array<{
  name: string;
  apiUrl: string;
  model: string;
  description: string;
}> = [
  {
    name: 'OpenAI',
    apiUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    description: 'gpt-4o-mini',
  },
  {
    name: 'Groq',
    apiUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-8b',
    description: 'Free tier available',
  },
];

export function LLMSettingsForm({ onSuccess }: LLMSettingsFormProps) {
  const [config, setConfig] = useState<LLMConfig>({
    storagePreference: StoragePreference.SESSION,
    apiUrl: '',
    apiKey: '',
    model: '',
    currentPassword: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  // Track current step for better feedback
  const [currentStep, setCurrentStep] = useState<'idle' | 'testing' | 'saving' | 'success' | 'error'>('idle');

  // Fetch current config on mount
  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/user/llm-config');

      // Handle 404/NOT_FOUND gracefully - means user hasn't set up config yet
      if (response.status === 404) {
        setConfig({
          storagePreference: StoragePreference.SESSION,
          apiUrl: '',
          apiKey: '',
          model: '',
          currentPassword: '',
        });
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch LLM settings');
      }

      const data = await response.json();

      // API returns data as { config: { ... } }
      const configData = data.config;

      // Initialize with default/empty values for security
      // Only use the storage preference from the server, everything else is empty
      setConfig({
        storagePreference: configData?.storagePreference || StoragePreference.SESSION,
        apiUrl: '', // Don't pre-fill for security
        apiKey: '', // Don't pre-fill API key for security
        model: '', // Don't pre-fill for security
        currentPassword: '', // Never pre-fill password
      });
    } catch (err) {
      console.error('Failed to fetch config:', err);
      // Don't show error for first-time users (404 is expected)
      // Only show error if it's a different type of error
      const isNotFoundError =
        err instanceof Error &&
        'Failed to fetch LLM settings' !== err.message;
      if (!isNotFoundError) {
        setErrors({ general: 'Failed to load LLM settings' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage('');
    setCurrentStep('idle');

    // Validate
    const newErrors: FormErrors = {};
    if (!config.apiUrl.trim()) {
      newErrors.apiUrl = 'API URL is required';
    }
    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
    } else if (config.apiKey.length < 10) {
      newErrors.apiKey = 'API Key appears to be invalid';
    }
    if (!config.model.trim()) {
      newErrors.model = 'Model is required';
    }

    // Require current password when using DATABASE storage
    if (config.storagePreference === StoragePreference.DATABASE && !config.currentPassword?.trim()) {
      newErrors.currentPassword = 'Current password is required to save encrypted credentials';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSaving(true);
    setTesting(true);
    setCurrentStep('testing');

    try {
      // First, validate the connection
      const testResponse = await fetch('/api/user/llm-config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });

      if (!testResponse.ok) {
        const testData = await testResponse.json();
        setCurrentStep('error');
        throw new Error(testData.error?.message || 'LLM connection test failed. Check your VPN, API key, or endpoint URL.');
      }

      // Test passed, now save
      setCurrentStep('saving');
      setTesting(false);

      // If test passed, save the config
      const response = await fetch('/api/user/llm-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePreference: config.storagePreference,
          apiUrl: config.apiUrl,
          apiKey: config.apiKey,
          model: config.model,
          password: config.storagePreference === StoragePreference.DATABASE ? config.currentPassword : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setCurrentStep('error');
        throw new Error(data.error?.message || 'Failed to save LLM settings');
      }

      setCurrentStep('success');
      setSuccessMessage('LLM settings saved and validated successfully');

      // Trigger event to refresh side panel
      window.dispatchEvent(new CustomEvent('llm-config-saved'));

      // Clear sensitive fields after save
      setConfig({
        ...config,
        apiUrl: '',
        apiKey: '',
        model: '',
        currentPassword: '',
      });
      setTimeout(() => {
        setSuccessMessage('');
        setCurrentStep('idle');
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setCurrentStep('error');
      setErrors({
        general: err instanceof Error ? err.message : 'Failed to save LLM settings',
      });
    } finally {
      setSaving(false);
      setTesting(false);
    }
  };

  // Helper function to get status banner classes
  const getStatusBannerClasses = () => {
    const base = 'border rounded-lg px-4 py-3 flex items-center gap-3 ';
    if (currentStep === 'testing') return base + 'bg-blue-50 border-blue-200 text-blue-700';
    if (currentStep === 'saving') return base + 'bg-purple-50 border-purple-200 text-purple-700';
    if (currentStep === 'success' || successMessage) return base + 'bg-green-50 border-green-200 text-green-700';
    if (currentStep === 'error' || errors.general) return base + 'bg-red-50 border-red-200 text-red-700';
    return base;
  };

  const handlePresetClick = (preset: typeof PRESETS[0]) => {
    setConfig({
      ...config,
      apiUrl: preset.apiUrl,
      model: preset.model,
    });
  };

  const handleApiUrlFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Clear placeholder on focus to make it easier to type
    if (e.target.value === '') {
      e.target.placeholder = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Storage Preference */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Preference</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose how you want to store your LLM credentials.
        </p>

        <div className="space-y-3">
          {STORAGE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`
                relative flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-colors
                ${config.storagePreference === option.value
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              <input
                type="radio"
                name="storagePreference"
                value={option.value}
                checked={config.storagePreference === option.value}
                onChange={(e) => setConfig({ ...config, storagePreference: e.target.value as StoragePreference })}
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={config.storagePreference === option.value ? 'text-indigo-700' : 'text-gray-700'}>
                    {option.icon}
                  </span>
                  <span className={`font-medium ${config.storagePreference === option.value ? 'text-indigo-900' : 'text-gray-900'}`}>
                    {option.label}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                <p className="text-xs text-gray-500 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                  {option.disclaimer}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Status Banner - Shows testing/saving/success/error states */}
      {(currentStep !== 'idle' || successMessage || errors.general) && (
        <div className={getStatusBannerClasses()}>
          {currentStep === 'testing' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <div>
                <p className="font-medium">Testing LLM Connection...</p>
                <p className="text-sm opacity-80">Validating your API credentials</p>
              </div>
            </>
          )}
          {currentStep === 'saving' && (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <div>
                <p className="font-medium">Saving Settings...</p>
                <p className="text-sm opacity-80">Almost there</p>
              </div>
            </>
          )}
          {currentStep === 'success' && (
            <>
              <Check className="w-5 h-5" />
              <div>
                <p className="font-medium flex items-center gap-2">
                  All Green!
                  <Sparkles className="w-4 h-4" />
                </p>
                <p className="text-sm opacity-80">Your LLM is configured and ready to use</p>
              </div>
            </>
          )}
          {(currentStep === 'error' || errors.general) && !successMessage && (
            <>
              <XCircle className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Connection Failed</p>
                <p className="text-sm opacity-80">{errors.general || 'Please check your settings and try again'}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Current Password - Required for DATABASE storage */}
      {config.storagePreference === StoragePreference.DATABASE && (
        <div className="max-w-2xl">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              value={config.currentPassword || ''}
              onChange={(e) => setConfig({ ...config, currentPassword: e.target.value })}
              placeholder="Enter your current password"
              className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                errors.currentPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
            >
              {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
            <LockIcon className="w-3 h-3" />
            Required to encrypt and save your credentials securely
          </p>
        </div>
      )}

      {/* API URL */}
      <div className="space-y-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Endpoint URL
          </label>
          <input
            type="text"
            value={config.apiUrl}
            onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
            onFocus={handleApiUrlFocus}
            placeholder="https://api.openai.com/v1"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
              errors.apiUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
          />
          {errors.apiUrl && (
            <p className="mt-1 text-sm text-red-600">{errors.apiUrl}</p>
          )}
        </div>

        {/* API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Enter your API key"
              className={`w-full px-4 py-3 pr-12 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm ${
                errors.apiKey ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.apiKey && (
            <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {config.storagePreference === StoragePreference.SESSION
              ? 'Your key will be stored in browser session only.'
              : 'Your key will be encrypted and stored securely.'}
          </p>
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Model
          </label>
          <input
            type="text"
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value })}
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
          <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Key className="w-4 h-4" />
            Popular Providers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="text-left px-3 py-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all text-sm"
              >
                <div className="font-medium text-gray-900">{preset.name}</div>
                <div className="text-xs text-gray-500">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing Connection...
            </>
          ) : saving ? (
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
  );
}
