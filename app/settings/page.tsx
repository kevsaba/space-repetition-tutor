'use client';

/**
 * Settings Page
 *
 * Allows authenticated users to update:
 * - Database configuration
 * - LLM configuration
 * - Password
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { SettingsForm } from '@/components/SettingsForm';

export default function SettingsPage() {
  const { user } = useAuth();

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
      <div className="px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Application Settings</h2>
          <p className="text-gray-600 mt-2">
            Manage your database connection, LLM provider, and account security
          </p>
        </div>

        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <SettingsForm />
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Changes to database and LLM settings will affect all users of this application.
            Password changes only affect your account.
          </p>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
