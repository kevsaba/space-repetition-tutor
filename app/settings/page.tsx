'use client';

/**
 * Settings Page
 *
 * Allows authenticated users to update:
 * - User settings (password)
 * - LLM configuration (per-user settings)
 * - Database connection settings
 */

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { LLMSettingsForm } from '@/components/LLMSettingsForm';
import { PasswordChangeForm } from '@/components/PasswordChangeForm';
import {
  User,
  Cpu,
  Database as DatabaseIcon,
} from 'lucide-react';

type SettingsTab = 'user' | 'llm' | 'database';

const TABS: Array<{ id: SettingsTab; label: string; icon: React.ReactNode; description: string }> = [
  {
    id: 'user',
    label: 'User Settings',
    icon: <User className="w-5 h-5" />,
    description: 'Manage your account security and password',
  },
  {
    id: 'llm',
    label: 'LLM Settings',
    icon: <Cpu className="w-5 h-5" />,
    description: 'Configure your AI provider credentials',
  },
  {
    id: 'database',
    label: 'Database Settings',
    icon: <DatabaseIcon className="w-5 h-5" />,
    description: 'Manage database connection settings',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>('user');
  const [llmSuccess, setLlmSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const activeTabConfig = TABS.find((tab) => tab.id === activeTab)!;

  return (
    <AuthenticatedLayout>
      {/* Main Content */}
      <div className="px-8 py-8 max-w-5xl">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-2">
            Manage your account, LLM configuration, and database settings
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="flex gap-8" aria-label="Settings tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                <span className={activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Tab Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-indigo-600">{activeTabConfig.icon}</span>
              <h3 className="text-lg font-semibold text-gray-900">{activeTabConfig.label}</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1 ml-7">{activeTabConfig.description}</p>
          </div>

          {/* Tab Body */}
          <div className="p-6">
            {activeTab === 'user' && (
              <PasswordChangeForm onSuccess={() => setPasswordSuccess(true)} />
            )}

            {activeTab === 'llm' && (
              <LLMSettingsForm onSuccess={() => setLlmSuccess(true)} />
            )}

            {activeTab === 'database' && (
              <div className="text-center py-12">
                <DatabaseIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Database Settings</h4>
                <p className="text-gray-500 max-w-md mx-auto">
                  Database connection settings are configured at the system level.
                  Please contact your administrator if you need to modify these settings.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
