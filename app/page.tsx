'use client';

/**
 * Home Page - Landing page with login/signup or redirect to study
 */

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push('/study');
    }
  }, [user, loading, router]);

  if (loading) {
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
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Space Repetition Tutor
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Master technical interviews with AI-powered spaced repetition
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="/login"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Login
            </a>
            <a
              href="/signup"
              className="px-8 py-3 bg-white text-indigo-600 border border-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
            >
              Sign Up
            </a>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Leitner System</h3>
            <p className="text-gray-600">
              Proven spaced repetition algorithm that focuses study time on weak areas
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Active Recall</h3>
            <p className="text-gray-600">
              Strengthen memory through active practice, not passive reading
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">AI Feedback</h3>
            <p className="text-gray-600">
              Get detailed, interview-ready feedback on every answer
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get Questions</h3>
                <p className="text-gray-600">
                  Questions due for review are prioritized based on your mastery level
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Answer & Get Feedback</h3>
                <p className="text-gray-600">
                  Submit your answer and receive detailed AI-powered feedback
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Track Progress</h3>
                <p className="text-gray-600">
                  Your progress is tracked automatically. Master concepts move to longer review intervals
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
