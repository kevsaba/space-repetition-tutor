'use client';

/**
 * Create Question Page - Dedicated page for manual question creation
 *
 * Allows authenticated users to manually add questions with:
 * - Searchable topic selector (select from existing or create new)
 * - Career selector dropdown (add to any of user's careers)
 * - Single question entry
 */

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ManualQuestionForm } from '@/components/ManualQuestionForm';
import Link from 'next/link';

export default function CreateQuestionPage() {
  const { user } = useAuth();
  const [successCount, setSuccessCount] = useState(0);

  const handleSuccess = () => {
    setSuccessCount(prev => prev + 1);
  };

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      {/* Main Content */}
      <div className="px-8 py-12">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Create Question
              </h1>
              <p className="text-gray-600">
                Add a single question to your study set
              </p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Success Counter */}
        {successCount > 0 && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-900">
                  {successCount} question{successCount !== 1 ? 's' : ''} added successfully!
                </p>
                <p className="text-sm text-green-700">Keep adding more or start studying.</p>
              </div>
            </div>
          </div>
        )}

        {/* Manual Question Form */}
        <ManualQuestionForm onSuccess={handleSuccess} />
      </div>
    </AuthenticatedLayout>
  );
}
