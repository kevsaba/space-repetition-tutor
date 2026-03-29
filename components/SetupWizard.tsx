'use client';

/**
 * Setup Wizard Component
 *
 * Multi-step wizard for initial application setup:
 * Step 1: Welcome
 * Step 2: Database Configuration
 * Step 3: LLM Configuration
 * Step 4: Validation & Complete
 */

import { useState, useEffect } from 'react';
import { Check, ChevronRight, Database, Cloud, Key, Globe, Loader2, ExternalLink } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

interface FormErrors {
  databaseUrl?: string;
  apiUrl?: string;
  apiKey?: string;
  model?: string;
}

type Step = 'welcome' | 'database' | 'llm' | 'validation' | 'complete';

const STEPS: Array<{ id: Step; title: string; icon: React.ReactNode }> = [
  { id: 'welcome', title: 'Welcome', icon: <Globe className="w-5 h-5" /> },
  { id: 'database', title: 'Database', icon: <Database className="w-5 h-5" /> },
  { id: 'llm', title: 'LLM Provider', icon: <Key className="w-5 h-5" /> },
  { id: 'validation', title: 'Validate', icon: <Cloud className="w-5 h-5" /> },
  { id: 'complete', title: 'Complete', icon: <Check className="w-5 h-5" /> },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<Step>('welcome');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [validationResult, setValidationResult] = useState<{
    database: boolean;
    llm: boolean;
  } | null>(null);

  // Helper function to derive direct URL from database URL
  const deriveDirectUrl = (dbUrl: string): string => {
    // For Supabase pooler URLs, convert to direct connection
    if (dbUrl.includes('pooler.supabase.com')) {
      return dbUrl
        .replace(':6543/', ':5432/')
        .replace('?pgbouncer=true', '')
        .replace('&pgbouncer=true', '');
    }
    // For other databases, use the same URL
    return dbUrl;
  };

  // Validate that the connection string is PostgreSQL
  const validatePostgresUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Database URL is required';
    }

    // Must start with postgres:// or postgresql://
    if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
      return 'This application requires PostgreSQL. Connection string must start with postgres:// or postgresql://';
    }

    // Basic URL structure validation
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'postgres:' && urlObj.protocol !== 'postgresql:') {
        return 'Only PostgreSQL databases are supported (mysql:, sqlite:, mongodb: are not compatible)';
      }
    } catch {
      return 'Invalid connection string format. Expected: postgresql://user:password@host:port/database';
    }

    return null; // Valid
  };

  // Form state
  const [formData, setFormData] = useState({
    databaseUrl: '',
    apiUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
  });

  const stepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Auto-trigger validation when entering validation step
  useEffect(() => {
    if (currentStep === 'validation' && validationResult === null && !isProcessing) {
      validateAndComplete();
    }
  }, [currentStep]);

  const handleNext = async () => {
    setErrors({});

    if (currentStep === 'database') {
      const newErrors: FormErrors = {};
      const dbError = validatePostgresUrl(formData.databaseUrl);
      if (dbError) {
        newErrors.databaseUrl = dbError;
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    if (currentStep === 'llm') {
      const newErrors: FormErrors = {};
      if (!formData.apiUrl.trim()) {
        newErrors.apiUrl = 'API URL is required';
      }
      if (!formData.apiKey.trim()) {
        newErrors.apiKey = 'API Key is required';
      }
      if (!formData.model.trim()) {
        newErrors.model = 'Model is required';
      }
      if (formData.apiKey.length < 10) {
        newErrors.apiKey = 'API Key appears to be invalid';
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
    }

    if (currentStep === 'validation') {
      setValidationResult(null);
      await validateAndComplete();
      return;
    }

    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1].id);
    }
  };

  const handleBack = () => {
    const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEPS[currentIndex - 1].id);
    }
  };

  const validateAndComplete = async () => {
    setIsProcessing(true);
    setValidationResult(null);

    const results = { database: false, llm: false };
    const directUrl = deriveDirectUrl(formData.databaseUrl);

    try {
      const response = await fetch('/api/setup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'database',
          config: {
            databaseUrl: formData.databaseUrl,
            directUrl: directUrl,
          },
        }),
      });
      if (response.ok) {
        results.database = true;
      } else {
        const data = await response.json();
        setErrors({ databaseUrl: data.error || 'Database connection failed' });
      }
    } catch (err) {
      setErrors({ databaseUrl: 'Failed to validate database connection' });
    }

    try {
      const response = await fetch('/api/setup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'llm',
          config: {
            apiUrl: formData.apiUrl,
            apiKey: formData.apiKey,
            model: formData.model,
          },
        }),
      });
      if (response.ok) {
        results.llm = true;
      } else {
        const data = await response.json();
        setErrors({ apiKey: data.error || 'LLM connection failed' });
      }
    } catch (err) {
      setErrors({ apiKey: 'Failed to validate LLM connection' });
    }

    setValidationResult(results);

    if (results.database && results.llm) {
      await saveConfiguration();
      setCurrentStep('complete');
    } else {
      setIsProcessing(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      const directUrl = deriveDirectUrl(formData.databaseUrl);
      const response = await fetch('/api/setup/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: {
            url: formData.databaseUrl,
            directUrl: directUrl,
          },
          llm: {
            apiUrl: formData.apiUrl,
            apiKey: formData.apiKey,
            model: formData.model,
          },
        }),
      });

      if (response.ok) {
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      setIsProcessing(false);
      setErrors({ databaseUrl: 'Failed to save configuration' });
    }
  };

  const getErrorForField = (field: keyof FormErrors): string | undefined => {
    return errors[field];
  };

  const handleRetryValidation = () => {
    setValidationResult(null);
    validateAndComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const isCompleted = index < stepIndex;
              const isCurrent = step.id === currentStep;
              const isError = currentStep === 'validation' && validationResult &&
                ((step.id === 'database' && !validationResult.database) ||
                 (step.id === 'llm' && !validationResult.llm));

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex items-center gap-2">
                    <div className={'w-8 h-8 rounded-full flex items-center justify-center ' +
                      (isCompleted
                        ? 'bg-green-500 text-white'
                        : isError
                        ? 'bg-red-500 text-white'
                        : isCurrent
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-200 text-gray-500')
                    }>
                      {isCompleted ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        step.icon
                      )}
                    </div>
                    <span className={'text-sm font-medium ' +
                      (isCurrent ? 'text-indigo-900' : 'text-gray-600')
                    }>
                      {step.title}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={'flex-1 h-0.5 mx-2 ' +
                      (isCompleted ? 'bg-green-500' : 'bg-gray-200')
                    } />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {currentStep === 'welcome' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Space Repetition Tutor
              </h1>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                This is your self-hosted study companion. Let&apos;s set up your environment
                in just a few steps.
              </p>

              {/* Supabase Promo in Welcome */}
              <a
                href="https://supabase.com?utm_source=space-repetition-tutor"
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl hover:shadow-lg transition-shadow max-w-md mx-auto"
              >
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-800">Need a database?</span>
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">FREE</span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      Get a free PostgreSQL database at Supabase.com →
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-green-600" />
                </div>
              </a>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 max-w-md mx-auto">
                <p className="font-medium mb-2">
                  <strong>You will need:</strong>
                </p>
                <ul className="text-left space-y-2 ml-4">
                  <li>✓ <strong>PostgreSQL</strong> database (Supabase recommended, free tier available)</li>
                  <li>✓ An LLM API key (OpenAI, Groq, or compatible)</li>
                </ul>
                <p className="mt-3 text-xs text-blue-700 border-t border-blue-300 pt-2">
                  <strong>Note:</strong> Only PostgreSQL is supported. MySQL, SQLite, and MongoDB are not compatible.
                </p>
              </div>
            </div>
          )}

          {currentStep === 'database' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Configure Database
              </h2>
              <p className="text-gray-600 mb-6">
                This app requires a <strong>PostgreSQL</strong> database. Other databases (MySQL, SQLite, MongoDB) are not supported.
              </p>

              {/* Supabase Promo Card */}
              <a
                href="https://supabase.com?utm_source=space-repetition-tutor"
                target="_blank"
                rel="noopener noreferrer"
                className="block mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-800">Supabase</span>
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-medium rounded-full">FREE</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      The easiest way to get started. PostgreSQL database with generous free tier, no credit card required.
                    </p>
                    <div className="flex items-center gap-1 text-xs text-green-600 mt-2 font-medium">
                      Create free account
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </a>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    PostgreSQL Connection String
                  </label>
                  <input
                    type="text"
                    value={formData.databaseUrl}
                    onChange={(e) => setFormData({ ...formData, databaseUrl: e.target.value })}
                    placeholder="postgresql://postgres:postgres@localhost:5432/spaced_repetition_tutor"
                    className={'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
                      (getErrorForField('databaseUrl') ? 'border-red-300 bg-red-50' : 'border-gray-300')
                    }
                  />
                  {getErrorForField('databaseUrl') && (
                    <p className="mt-1 text-sm text-red-600">{getErrorForField('databaseUrl')}</p>
                  )}
                  {formData.databaseUrl && !getErrorForField('databaseUrl') && formData.databaseUrl.includes('pooler.supabase.com') && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      <span className="font-medium">Supabase pooler detected!</span> Direct connection will be auto-generated.
                    </p>
                  )}
                  {formData.databaseUrl && !getErrorForField('databaseUrl') && !formData.databaseUrl.includes('supabase') && (
                    <p className="mt-1 text-xs text-blue-600">
                      ✓ Valid PostgreSQL connection string
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Quick Options:
                  </p>
                  <div className="space-y-2 text-sm">
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          databaseUrl: 'postgresql://postgres:postgres@host.docker.internal:5432/spaced_repetition_tutor',
                        });
                      }}
                      className="block w-full text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">Local PostgreSQL (Docker)</div>
                      <div className="text-gray-500 text-xs">host.docker.internal:5432</div>
                    </button>
                    <button
                      onClick={() => {
                        const supabaseUrl = prompt('Enter your Supabase connection string:\n\nGet it from: Supabase Dashboard → Project Settings → Database\n\nYou can use either the Pooler (port 6543) or Direct (port 5432) connection string.', 'postgresql://postgres.YOUR_PROJECT_REF:PASSWORD@aws-1-xx.pooler.supabase.com:6543/postgres?pgbouncer=true');
                        if (supabaseUrl) {
                          setFormData({
                            ...formData,
                            databaseUrl: supabaseUrl,
                          });
                        }
                      }}
                      className="block w-full text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div className="font-medium text-gray-900">Supabase (paste connection string)</div>
                      <div className="text-gray-500 text-xs">We'll auto-generate the direct connection</div>
                    </button>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-800">
                    <strong>PostgreSQL only:</strong> This application is built for PostgreSQL. MySQL, SQLite, MongoDB, and other databases are not supported.
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'llm' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Configure LLM Provider
              </h2>
              <p className="text-gray-600 mb-6">
                Connect to your LLM provider. Your API key is stored locally on your server.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={formData.apiUrl}
                    onChange={(e) => setFormData({ ...formData, apiUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    className={'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
                      (getErrorForField('apiUrl') ? 'border-red-300 bg-red-50' : 'border-gray-300')
                    }
                  />
                  {getErrorForField('apiUrl') && (
                    <p className="mt-1 text-sm text-red-600">{getErrorForField('apiUrl')}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className={'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
                      (getErrorForField('apiKey') ? 'border-red-300 bg-red-50' : 'border-gray-300')
                    }
                  />
                  {getErrorForField('apiKey') && (
                    <p className="mt-1 text-sm text-red-600">{getErrorForField('apiKey')}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Your key is stored on your server and never sent elsewhere.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="gpt-4o-mini"
                    className={'w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
                      (getErrorForField('model') ? 'border-red-300 bg-red-50' : 'border-gray-300')
                    }
                  />
                  {getErrorForField('model') && (
                    <p className="mt-1 text-sm text-red-600">{getErrorForField('model')}</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Popular Providers:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          apiUrl: 'https://api.openai.com/v1',
                          model: 'gpt-4o-mini',
                        });
                      }}
                      className="text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="font-medium text-gray-900">OpenAI</div>
                      <div className="text-xs text-gray-500">gpt-4o-mini</div>
                    </button>
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          apiUrl: 'https://api.groq.com/openai/v1',
                          model: 'llama-3.3-8b',
                        });
                      }}
                      className="text-left px-3 py-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors text-sm"
                    >
                      <div className="font-medium text-gray-900">Groq</div>
                      <div className="text-xs text-gray-500">Free tier available</div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'validation' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Validate Configuration
              </h2>
              <p className="text-gray-600 mb-6">
                Let&apos;s verify that your connections work properly.
              </p>

              <div className="space-y-3">
                <div className={'border rounded-lg p-4 ' +
                  (validationResult?.database
                    ? 'bg-green-50 border-green-200'
                    : validationResult !== null
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200')
                }>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Database Connection</span>
                    </div>
                    {isProcessing && validationResult === null ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : validationResult?.database ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : validationResult !== null && !validationResult.database ? (
                      <span className="text-red-600 text-sm">Failed</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Pending</span>
                    )}
                  </div>
                  {validationResult !== null && !validationResult.database && (
                    <p className="text-sm text-red-600 mt-2">{getErrorForField('databaseUrl')}</p>
                  )}
                </div>

                <div className={'border rounded-lg p-4 ' +
                  (validationResult?.llm
                    ? 'bg-green-50 border-green-200'
                    : validationResult !== null
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200')
                }>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">LLM Provider</span>
                    </div>
                    {isProcessing && validationResult === null ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : validationResult?.llm ? (
                      <Check className="w-5 h-5 text-green-600" />
                    ) : validationResult !== null && !validationResult.llm ? (
                      <span className="text-red-600 text-sm">Failed</span>
                    ) : (
                      <span className="text-gray-400 text-sm">Pending</span>
                    )}
                  </div>
                  {validationResult !== null && !validationResult.llm && (
                    <p className="text-sm text-red-600 mt-2">{getErrorForField('apiKey')}</p>
                  )}
                </div>
              </div>

              {validationResult !== null && (!validationResult.database || !validationResult.llm) && (
                <div className="mt-6">
                  <button
                    onClick={handleRetryValidation}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Retry Validation
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Setup Complete!
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your Space Repetition Tutor is ready. Create an account to get started with your learning journey.
              </p>
              <div className="flex flex-col gap-3 items-center">
                <a
                  href="/signup"
                  className="w-full max-w-xs px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-center"
                >
                  Create Account
                </a>
                <a
                  href="/login"
                  className="w-full max-w-xs px-8 py-2 text-sm text-gray-600 hover:text-gray-900 underline text-center"
                >
                  Already have an account? Sign in
                </a>
              </div>
            </div>
          )}

          {currentStep !== 'complete' && currentStep !== 'validation' && (
            <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleNext}
                disabled={isProcessing}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {currentStep !== 'welcome' && currentStep !== 'complete' && currentStep !== 'validation' && (
            <div className="flex justify-start mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {currentStep === 'validation' && !isProcessing && validationResult !== null && (!validationResult.database || !validationResult.llm) && (
            <div className="flex justify-start mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Back to Fix
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-gray-500">
          Configuration is stored on your server. Your data stays in your database.
        </div>
      </div>
    </div>
  );
}
