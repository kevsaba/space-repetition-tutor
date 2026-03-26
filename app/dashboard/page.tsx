'use client';

/**
 * Dashboard Page
 *
 * Displays user's learning progress including:
 * - Box distribution (questions in each Leitner box)
 * - Review schedule explanation
 * - Quick links to start studying
 * - Add questions manually or via CSV/Excel upload
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { BoxDistributionCard } from '@/components/BoxDistributionCard';
import { ReviewSchedule } from '@/components/ReviewSchedule';
import { ManualQuestionForm } from '@/components/ManualQuestionForm';
import Link from 'next/link';

interface BoxDistribution {
  box1: number;
  box2: number;
  box3: number;
}

interface DashboardStats {
  boxDistribution: BoxDistribution;
  totalQuestions: number;
  answeredToday: number;
  dueToday: number;
  currentStreak: number;
}

const boxConfig = [
  {
    box: 1,
    reviewInterval: 'Review daily',
    colorClass: 'text-amber-600',
    bgColorClass: 'bg-amber-500',
    borderColorClass: 'border-amber-500',
    iconBgClass: 'bg-amber-100',
    iconColorClass: 'text-amber-700',
  },
  {
    box: 2,
    reviewInterval: 'Review every 3 days',
    colorClass: 'text-blue-600',
    bgColorClass: 'bg-blue-500',
    borderColorClass: 'border-blue-500',
    iconBgClass: 'bg-blue-100',
    iconColorClass: 'text-blue-700',
  },
  {
    box: 3,
    reviewInterval: 'Review weekly',
    colorClass: 'text-green-600',
    bgColorClass: 'bg-green-500',
    borderColorClass: 'border-green-500',
    iconBgClass: 'bg-green-100',
    iconColorClass: 'text-green-700',
  },
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [activeCareer, setActiveCareer] = useState<{ id: string; name: string } | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch stats on mount
  useEffect(() => {
    if (user) {
      fetchStats();
      fetchActiveCareer();
    }
  }, [user]);

  const fetchActiveCareer = async () => {
    try {
      const response = await fetch('/api/careers/active');
      if (response.ok) {
        const data = await response.json();
        setActiveCareer(data.userCareer?.career || null);
      }
    } catch (err) {
      console.error('Failed to fetch active career:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Fetch stats error:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Space Repetition Tutor</h1>
              <p className="text-sm text-gray-600">Welcome, {user.username}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/study"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Study
              </Link>
              <Link
                href="/settings"
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Your Learning Dashboard</h2>
          <p className="text-gray-600 mt-2">Track your progress and stay on top of your reviews</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchStats}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Questions</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalQuestions}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Answered Today</p>
                  <p className="text-3xl font-bold text-indigo-600 mt-1">{stats.answeredToday}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Streak</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Box Distribution */}
        {stats && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Box Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {boxConfig.map((config) => {
                const count = config.box === 1 ? stats.boxDistribution.box1 :
                              config.box === 2 ? stats.boxDistribution.box2 :
                              stats.boxDistribution.box3;
                return (
                  <BoxDistributionCard
                    key={config.box}
                    box={config.box}
                    count={count}
                    reviewInterval={config.reviewInterval}
                    colorClass={config.colorClass}
                    bgColorClass={config.bgColorClass}
                    borderColorClass={config.borderColorClass}
                    iconBgClass={config.iconBgClass}
                    iconColorClass={config.iconColorClass}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Review Schedule */}
        <div className="mb-8">
          <ReviewSchedule />
        </div>

        {/* Add Questions Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Add Questions</h3>
          <div className="space-y-4">
            {/* Manual Question Entry - Collapsible */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">Add Question Manually</h4>
                    <p className="text-sm text-gray-500">Enter a single question with topic selection</p>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${showManualForm ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showManualForm && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  <ManualQuestionForm
                    onSuccess={() => {
                      setShowManualForm(false);
                      fetchStats();
                      fetchActiveCareer();
                    }}
                    onCancel={() => setShowManualForm(false)}
                  />
                </div>
              )}
            </div>

            {/* CSV/Excel Upload - Link to dedicated page */}
            <Link href="/upload" className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <h4 className="font-medium text-gray-900">Upload CSV/Excel</h4>
                    <p className="text-sm text-gray-500">Bulk upload multiple questions from a file</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          </div>
        </div>

        {/* Call to Action */}
        {stats && stats.dueToday > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-indigo-900 mb-2">
              You have {stats.dueToday} question{stats.dueToday !== 1 ? 's' : ''} due today!
            </h3>
            <p className="text-indigo-700 mb-4">Keep up the momentum and strengthen your knowledge.</p>
            <Link
              href="/study"
              className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Start Studying
            </Link>
          </div>
        )}

        {stats && stats.dueToday === 0 && stats.totalQuestions > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-green-900 mb-2">All caught up!</h3>
            <p className="text-green-700 mb-4">No questions due right now. Start a new session to practice more.</p>
            <Link
              href="/study"
              className="inline-block px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Start New Session
            </Link>
          </div>
        )}

        {stats && stats.totalQuestions === 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to your learning journey!</h3>
            <p className="text-gray-600 mb-4">Start your first session to generate questions tailored for you.</p>
            <Link
              href="/study"
              className="inline-block px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
