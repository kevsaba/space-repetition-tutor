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
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { BoxDistributionCard } from '@/components/BoxDistributionCard';
import { ReviewSchedule } from '@/components/ReviewSchedule';
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
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCareer, setActiveCareer] = useState<{ id: string; name: string } | null>(null);

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

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your dashboard...</p>
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
      </div>
    </AuthenticatedLayout>
  );
}
