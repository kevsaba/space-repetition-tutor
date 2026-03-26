'use client';

/**
 * Settings Page
 *
 * Allows authenticated users to update:
 * - LLM configuration (per-user settings)
 * - Password
 */

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { LLMSettingsForm } from '@/components/LLMSettingsForm';
import { PasswordChangeForm } from '@/components/PasswordChangeForm';

export default function SettingsPage() {
  const { user } = useAuth();
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

  return (
    <AuthenticatedLayout>
      {/* Main Content */}
      <div className="px-8 py-8 max-w-5xl">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600 mt-2">
            Manage your LLM configuration and account security
          </p>
        </div>

        {/* LLM Settings Section */}
        <section className="mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">LLM Configuration</h3>
              <p className="text-sm text-gray-500 mt-1">
                Configure your AI provider credentials for question generation and evaluation
              </p>
            </div>
            <div className="p-6">
              <LLMSettingsForm onSuccess={() => setLlmSuccess(true)} />
            </div>
          </div>
        </section>

        {/* Password Section */}
        <section>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Change Password</h3>
              <p className="text-sm text-gray-500 mt-1">
                Update your password to keep your account secure
              </p>
            </div>
            <div className="p-6">
              <PasswordChangeForm onSuccess={() => setPasswordSuccess(true)} />
            </div>
          </div>
        </section>
      </div>
    </AuthenticatedLayout>
  );
}
