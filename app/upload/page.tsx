'use client';

/**
 * Upload Page - Dedicated page for PDF upload
 *
 * Allows authenticated users to upload a PDF file containing
 * interview questions to create a custom career path.
 */

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PDFUploader } from '@/components/PDFUploader';
import Link from 'next/link';

interface PDFUploadResult {
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
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showSuccess, setShowSuccess] = useState(false);
  const [successResult, setSuccessResult] = useState<PDFUploadResult | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const handleUploadSuccess = (result: PDFUploadResult) => {
    setSuccessResult(result);
    setShowSuccess(true);
  };

  const handleStartStudying = () => {
    router.push('/study');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <Link href="/study" className="text-2xl font-bold text-gray-900 hover:text-indigo-600 transition-colors">
              Space Repetition Tutor
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Welcome, {user?.username}</span>
            <Link
              href="/study"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Back to Study
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {!showSuccess ? (
          <>
            {/* Page Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Upload Your Interview Questions
              </h1>
              <p className="text-gray-600">
                Create a personalized career path from your own study materials
              </p>
            </div>

            {/* PDF Uploader Component */}
            <PDFUploader onSuccess={handleUploadSuccess} />
          </>
        ) : (
          /* Success View */
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-8 text-center">
              {/* Success Icon */}
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Success Message */}
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Your Career Path is Ready!
              </h2>
              <p className="text-gray-600 mb-8">
                <span className="font-semibold">{successResult?.careerName}</span> has been created
              </p>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-indigo-50 rounded-xl p-6">
                  <p className="text-4xl font-bold text-indigo-600">
                    {successResult?.topicsCreated}
                  </p>
                  <p className="text-sm text-indigo-700 mt-1">Topics Created</p>
                </div>
                <div className="bg-green-50 rounded-xl p-6">
                  <p className="text-4xl font-bold text-green-600">
                    {successResult?.questionsAdded}
                  </p>
                  <p className="text-sm text-green-700 mt-1">Questions Added</p>
                </div>
              </div>

              {/* Topic Breakdown */}
              {successResult?.topics && successResult.topics.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Topics Created</h3>
                  <ul className="space-y-3">
                    {successResult.topics.map((topic, index) => (
                      <li
                        key={index}
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </div>
                          <span className="font-medium text-gray-900">{topic.name}</span>
                        </div>
                        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                          {topic.questionsAdded} questions
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={handleStartStudying}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Studying
                </button>
                <button
                  onClick={() => {
                    setShowSuccess(false);
                    setSuccessResult(null);
                  }}
                  className="px-8 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Upload Another PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* How it Works Section */}
        {!showSuccess && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Upload your PDF</h3>
                  <p className="text-sm text-gray-600">
                    Upload a PDF containing interview questions and answers. Maximum file size is 10MB.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">We extract the content</h3>
                  <p className="text-sm text-gray-600">
                    Our system parses your PDF to identify topics and questions automatically.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Start practicing</h3>
                  <p className="text-sm text-gray-600">
                    Questions are added to your Leitner boxes. Practice with spaced repetition to master them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
