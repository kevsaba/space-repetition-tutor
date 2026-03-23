'use client';

/**
 * Study Page - Main study flow
 *
 * Fetches due questions and handles the question → answer → feedback → next question flow.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { QuestionDisplay } from '@/components/QuestionDisplay';
import { AnswerInput } from '@/components/AnswerInput';
import { FeedbackDisplay } from '@/components/FeedbackDisplay';

interface Question {
  id: string;
  content: string;
  topic: {
    name: string;
    category: string;
    track: string;
  };
  box: number;
  timesSeen: number;
  isNew: boolean;
  type: string;
  difficulty: string;
}

type StudyState = 'loading' | 'question' | 'feedback' | 'complete' | 'error';

export default function StudyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [studyState, setStudyState] = useState<StudyState>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{
    passed: boolean;
    newBox: number;
    nextDueDate: Date;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch first question on mount
  useEffect(() => {
    if (user && !sessionId) {
      fetchQuestions();
    }
  }, [user]);

  const fetchQuestions = async () => {
    setStudyState('loading');
    setError('');

    try {
      const response = await fetch(`/api/questions/due?limit=1&sessionId=${sessionId || ''}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();

      if (data.questions.length === 0) {
        setStudyState('complete');
      } else {
        setCurrentQuestion(data.questions[0]);
        setSessionId(data.sessionId);
        setStudyState('question');
      }
    } catch (err) {
      console.error('Fetch questions error:', err);
      setError('Failed to load questions. Please try again.');
      setStudyState('error');
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!currentQuestion) return;

    setStudyState('loading');

    try {
      const response = await fetch(`/api/questions/${currentQuestion.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer,
          mode: 'FREE',
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit answer');
      }

      const data = await response.json();
      setFeedback({
        passed: data.passed,
        newBox: data.newBox,
        nextDueDate: new Date(data.nextDueDate),
      });
      setStudyState('feedback');
    } catch (err) {
      console.error('Submit answer error:', err);
      setError('Failed to submit answer. Please try again.');
      setStudyState('error');
    }
  };

  const handleNext = () => {
    setFeedback(null);
    setCurrentQuestion(null);
    fetchQuestions();
  };

  const handleLogout = () => {
    // This will be handled by AuthContext logout
    router.push('/login');
  };

  if (authLoading || !user) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Space Repetition Tutor</h1>
            <p className="text-sm text-gray-600">Welcome, {user.username}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={fetchQuestions}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {studyState === 'loading' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading question...</p>
          </div>
        )}

        {studyState === 'question' && currentQuestion && (
          <div className="space-y-6">
            <QuestionDisplay question={currentQuestion} />
            <AnswerInput onSubmit={handleSubmitAnswer} />
          </div>
        )}

        {studyState === 'feedback' && feedback && (
          <FeedbackDisplay
            passed={feedback.passed}
            newBox={feedback.newBox}
            nextDueDate={feedback.nextDueDate}
            onNext={handleNext}
          />
        )}

        {studyState === 'complete' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All caught up!</h2>
            <p className="text-gray-600 mb-6">
              You've reviewed all your due questions. Come back later for more practice.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Back to Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
