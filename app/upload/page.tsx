'use client';

/**
 * Upload Page - Dedicated page for CSV/Excel file upload
 *
 * Allows authenticated users to upload a CSV/Excel file containing
 * interview questions to create a custom career path.
 */

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { CSVUploader } from '@/components/CSVUploader';

interface CSVUploadResult {
  careerId: string;
  careerName: string;
  topicsCreated: number;
  questionsAdded: number;
  topics: Array<{
    name: string;
    questionsAdded: number;
  }>;
}

export default function UploadPage() {
  const { user } = useAuth();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successResult, setSuccessResult] = useState<CSVUploadResult | null>(null);

  const handleUploadSuccess = (result: CSVUploadResult) => {
    setSuccessResult(result);
    setShowSuccess(true);
  };

  const handleStartStudying = () => {
    // Store the desired mode in sessionStorage so the study page can pick it up
    sessionStorage.setItem('startInInterviewMode', 'true');
    window.location.href = '/study';
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
        {!showSuccess ? (
          <>
            {/* Page Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Upload Your Interview Questions
              </h1>
              <p className="text-gray-600">
                Create a personalized career path from a CSV or Excel file
              </p>
            </div>

            {/* CSV Uploader Component */}
            <CSVUploader onSuccess={handleUploadSuccess} />
          </>
        ) : (
          /* Success View */
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Career Path Created Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              <span className="font-medium">{successResult?.careerName}</span> is ready for studying
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 max-w-sm mx-auto">
              <div className="bg-indigo-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-indigo-600">{successResult?.topicsCreated || 0}</p>
                <p className="text-sm text-indigo-700">Topics Created</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600">{successResult?.questionsAdded || 0}</p>
                <p className="text-sm text-green-700">Questions Added</p>
              </div>
            </div>

            {/* Topic breakdown */}
            {successResult?.topics && successResult.topics.length > 0 && (
              <div className="text-left bg-gray-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Topics:</h3>
                <ul className="space-y-2">
                  {successResult.topics.map((topic, index) => (
                    <li key={index} className="flex justify-between text-sm border-b border-gray-200 pb-2 last:pb-0 last:border-0">
                      <span className="text-gray-700">{topic.name}</span>
                      <span className="text-gray-500">{topic.questionsAdded} questions</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  setSuccessResult(null);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Upload Another File
              </button>
              <button
                onClick={handleStartStudying}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Start Studying
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
