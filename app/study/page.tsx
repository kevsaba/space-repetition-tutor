'use client';

/**
 * Study Page - Main study flow
 *
 * Supports both FREE and INTERVIEW modes:
 * - FREE: Explore topics freely using Leitner system
 * - INTERVIEW: Structured preparation following career track order
 *
 * Handles the question -> answer -> feedback -> follow-ups -> complete flow.
 * Follow-up answers are evaluated by the LLM and results affect the final box level.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { QuestionDisplay } from '@/components/QuestionDisplay';
import { AnswerInput } from '@/components/AnswerInput';
import { FeedbackDisplay } from '@/components/FeedbackDisplay';
import { CareerSelector } from '@/components/CareerSelector';
import { ModeSelector } from '@/components/ModeSelector';
import { InterviewProgress, CompactProgress } from '@/components/InterviewProgress';

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

interface LLMFeedback {
  evaluation: string;
  higherLevelArticulation: string;
  correction: string;
  failureTimeline: string;
  interviewReadyAnswer: string;
  analogy: string;
  productionInsight: string;
}

interface FollowUpQuestion {
  content: string;
  reason: string;
}

interface FollowUpResult {
  question: string;
  answer: string;
  passed: boolean;
  feedback: LLMFeedback;
}

type StudyState =
  | 'loading'
  | 'question'
  | 'evaluating'
  | 'feedback'
  | 'followup'
  | 'evaluating_followup'
  | 'followup_feedback'
  | 'finalizing'
  | 'final_feedback'
  | 'complete'
  | 'error';

type StudyMode = 'FREE' | 'INTERVIEW';

export default function StudyPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Interview mode state
  const [studyMode, setStudyMode] = useState<StudyMode>('FREE');
  const [hasActiveCareer, setHasActiveCareer] = useState(false);
  const [showCareerSelector, setShowCareerSelector] = useState(false);
  const [isCareerSelectorOpen, setIsCareerSelectorOpen] = useState(false);

  // Interview progress state
  const [interviewProgress, setInterviewProgress] = useState<{
    currentTopicIndex: number;
    totalTopics: number;
    currentTopicName: string;
    questionsAnswered: number;
    questionsPerTopic: number;
  } | null>(null);

  const [studyState, setStudyState] = useState<StudyState>('loading');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [feedback, setFeedback] = useState<{
    passed: boolean;
    newBox: number;
    nextDueDate: Date;
    feedback: LLMFeedback;
    followUpQuestions: FollowUpQuestion[];
  } | null>(null);
  const [currentFollowUpIndex, setCurrentFollowUpIndex] = useState(0);
  const [followUpResults, setFollowUpResults] = useState<FollowUpResult[]>([]);
  const [currentFollowUpFeedback, setCurrentFollowUpFeedback] = useState<{
    passed: boolean;
    feedback: LLMFeedback;
  } | null>(null);
  const [finalResult, setFinalResult] = useState<{
    passed: boolean;
    currentBox: number;
    newBox: number;
    nextDueDate: Date;
  } | null>(null);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

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

  // Check if user has an active career for interview mode
  // Only check on initial mount if in INTERVIEW mode, not on mode switch
  useEffect(() => {
    const checkActiveCareer = async () => {
      try {
        const response = await fetch('/api/careers/active');
        if (response.ok) {
          setHasActiveCareer(true);
        }
      } catch (err) {
        setHasActiveCareer(false);
      }
    };
    // Only check if in INTERVIEW mode to avoid unnecessary API calls
    if (studyMode === 'INTERVIEW') {
      checkActiveCareer();
    }
  }, []);

  // Handle mode change
  const handleModeChange = (newMode: StudyMode) => {
    if (newMode === 'INTERVIEW' && !hasActiveCareer) {
      // Open the career selector dropdown directly, no modal needed
      setIsCareerSelectorOpen(true);
      return;
    }
    setStudyMode(newMode);
    // Reset session when changing modes
    setSessionId(undefined);
    setCurrentQuestion(null);
    // In FREE mode, clear interview progress and career context
    if (newMode === 'FREE') {
      setInterviewProgress(null);
      // Note: We keep hasActiveCareer as-is so user can switch back to INTERVIEW
    }
    fetchQuestions(newMode);
  };

  // Handle career selection
  const handleCareerSelected = () => {
    setHasActiveCareer(true);
    setShowCareerSelector(false);
    setIsCareerSelectorOpen(false);
    setStudyMode('INTERVIEW');
    setSessionId(undefined);
    setCurrentQuestion(null);
    fetchQuestions('INTERVIEW');
  };

  const fetchQuestions = async (mode?: StudyMode) => {
    setStudyState('loading');
    setError('');

    const actualMode = mode || studyMode;
    const params = new URLSearchParams({
      limit: '1',
      sessionId: sessionId || '',
      mode: actualMode,
    });

    try {
      const response = await fetch(`/api/questions/due?${params.toString()}`);
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

        // Update interview progress if provided
        if (data.interviewProgress) {
          setInterviewProgress(data.interviewProgress);
        }
      }
      setRetryCount(0);
    } catch (err) {
      console.error('Fetch questions error:', err);
      setError('Failed to load questions. Please try again.');
      setStudyState('error');
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!currentQuestion) return;

    setStudyState('evaluating');
    setError('');

    try {
      const response = await fetch(`/api/questions/${currentQuestion.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer,
          mode: studyMode,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errorData.error?.message || 'Failed to submit answer');
      }

      const data = await response.json();
      setFeedback({
        passed: data.passed,
        newBox: data.newBox,
        nextDueDate: new Date(data.nextDueDate),
        feedback: data.feedback,
        followUpQuestions: data.followUpQuestions || [],
      });
      setCurrentFollowUpIndex(0);
      setFollowUpResults([]);

      // Check if there are follow-up questions
      if (data.followUpQuestions && data.followUpQuestions.length > 0) {
        setStudyState('feedback'); // Show feedback first, then follow-ups
      } else {
        setStudyState('feedback');
      }
      setRetryCount(0);
    } catch (err) {
      console.error('Submit answer error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(errorMessage);

      // Allow retry if it's a network error or server error
      if (retryCount < 3) {
        setRetryCount(retryCount + 1);
        setStudyState('question');
      } else {
        setStudyState('error');
      }
    }
  };

  const handleSubmitFollowUpAnswer = async (answer: string) => {
    if (!currentQuestion || !feedback) return;

    setStudyState('evaluating_followup');
    setError('');

    // Get the current follow-up question text - required by API
    const currentFollowUpQuestion = feedback.followUpQuestions[currentFollowUpIndex]?.content;

    if (!currentFollowUpQuestion) {
      setError('Follow-up question not found. Please try again.');
      setStudyState('followup');
      return;
    }

    try {
      const response = await fetch(`/api/questions/${currentQuestion.id}/followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answer,
          followUpQuestion: currentFollowUpQuestion,
          sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errorData.error?.message || 'Failed to submit follow-up answer');
      }

      const data = await response.json();

      // Store the result
      const currentFollowUp = feedback.followUpQuestions[currentFollowUpIndex];
      const result: FollowUpResult = {
        question: currentFollowUp.content,
        answer,
        passed: data.passed,
        feedback: data.feedback,
      };
      setFollowUpResults([...followUpResults, result]);
      setCurrentFollowUpFeedback({
        passed: data.passed,
        feedback: data.feedback,
      });

      setStudyState('followup_feedback');
      setRetryCount(0);
    } catch (err) {
      console.error('Submit follow-up answer error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit follow-up answer';
      setError(errorMessage);

      if (retryCount < 3) {
        setRetryCount(retryCount + 1);
        setStudyState('followup');
      } else {
        setStudyState('error');
      }
    }
  };

  const handleNext = () => {
    // After initial feedback, move to follow-ups
    if (studyState === 'feedback' && feedback && feedback.followUpQuestions.length > 0) {
      setStudyState('followup');
      return;
    }

    // After follow-up feedback, move to next follow-up or complete
    if (studyState === 'followup_feedback') {
      if (currentFollowUpIndex + 1 < feedback!.followUpQuestions.length) {
        // More follow-ups remaining
        setCurrentFollowUpIndex(currentFollowUpIndex + 1);
        setCurrentFollowUpFeedback(null);
        setStudyState('followup');
      } else {
        // All follow-ups done, finalize the session
        handleCompleteSession();
      }
      return;
    }

    // After final feedback, fetch next question
    if (studyState === 'final_feedback') {
      setFeedback(null);
      setCurrentFollowUpIndex(0);
      setFollowUpResults([]);
      setCurrentFollowUpFeedback(null);
      setFinalResult(null);
      setCurrentQuestion(null);
      fetchQuestions();
      return;
    }

    // No follow-ups, fetch next question directly
    if (studyState === 'feedback') {
      setFeedback(null);
      setCurrentFollowUpIndex(0);
      setCurrentQuestion(null);
      fetchQuestions();
    }
  };

  const handleCompleteSession = async () => {
    if (!currentQuestion) return;

    setStudyState('finalizing');
    setError('');

    try {
      const response = await fetch(`/api/questions/${currentQuestion.id}/complete`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        throw new Error(errorData.error?.message || 'Failed to complete session');
      }

      const data = await response.json();
      setFinalResult({
        passed: data.passed,
        currentBox: data.currentBox,
        newBox: data.newBox,
        nextDueDate: new Date(data.nextDueDate),
      });
      setStudyState('final_feedback');
      setRetryCount(0);
    } catch (err) {
      console.error('Complete session error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete session';
      setError(errorMessage);
      setStudyState('error');
    }
  };

  const handleSkipFollowUps = () => {
    // Skip remaining follow-ups and finalize the session
    handleCompleteSession();
  };

  const handleLogout = () => {
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
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 min-h-[72px]">
          {/* Top row - Logo, Mode Selector, Career Selector, Logout */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Space Repetition Tutor</h1>
              <p className="text-sm text-gray-600">Welcome, {user.username}</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Dashboard
              </Link>
              <ModeSelector
                currentMode={studyMode}
                onModeChange={handleModeChange}
                hasActiveCareer={hasActiveCareer}
              />
              <CareerSelector
                onCareerChange={handleCareerSelected}
                studyMode={studyMode}
                isOpen={isCareerSelectorOpen}
                onOpenChange={setIsCareerSelectorOpen}
                className={studyMode === 'INTERVIEW' ? 'ring-2 ring-indigo-200' : ''}
              />
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Progress row - Only show in INTERVIEW mode */}
          <div className="min-h-[40px]">
            {studyMode === 'INTERVIEW' && interviewProgress && (
              <CompactProgress
                currentTopicIndex={interviewProgress.currentTopicIndex}
                totalTopics={interviewProgress.totalTopics}
                currentTopicName={interviewProgress.currentTopicName}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Interview Progress Card - Only show in INTERVIEW mode */}
        {studyMode === 'INTERVIEW' && interviewProgress && (
          <div className="mb-6">
            <InterviewProgress
              currentTopicIndex={interviewProgress.currentTopicIndex}
              totalTopics={interviewProgress.totalTopics}
              currentTopicName={interviewProgress.currentTopicName}
              questionsAnswered={interviewProgress.questionsAnswered}
              questionsPerTopic={interviewProgress.questionsPerTopic}
            />
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            <p className="font-medium">Error</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={() => {
                setError('');
                if (studyState === 'error') {
                  fetchQuestions();
                } else {
                  setStudyState('question');
                }
              }}
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

        {studyState === 'evaluating' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Evaluating your answer...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        )}

        {studyState === 'evaluating_followup' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Evaluating your follow-up answer...</p>
            <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
          </div>
        )}

        {studyState === 'finalizing' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Finalizing your session...</p>
            <p className="text-sm text-gray-500 mt-2">Calculating your final box level</p>
          </div>
        )}

        {studyState === 'question' && currentQuestion && (
          <div className="space-y-6">
            <QuestionDisplay question={currentQuestion} />
            <AnswerInput onSubmit={handleSubmitAnswer} loading={false} />
          </div>
        )}

        {studyState === 'feedback' && feedback && (
          <FeedbackDisplay
            passed={feedback.passed}
            newBox={feedback.newBox}
            nextDueDate={feedback.nextDueDate}
            feedback={feedback.feedback}
            followUpQuestions={feedback.followUpQuestions}
            onNext={handleNext}
            loading={false}
            buttonText={feedback.followUpQuestions.length > 0 ? 'Continue to Follow-ups' : 'Next Question'}
          />
        )}

        {/* Follow-up Feedback Display */}
        {studyState === 'followup_feedback' && currentFollowUpFeedback && feedback && (
          <div className="space-y-6">
            {/* Follow-up Result Summary */}
            <div className={`rounded-lg p-4 border ${
              currentFollowUpFeedback.passed
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentFollowUpFeedback.passed ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {currentFollowUpFeedback.passed ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${
                    currentFollowUpFeedback.passed ? 'text-green-900' : 'text-amber-900'
                  }`}>
                    Follow-up {currentFollowUpIndex + 1} of {feedback.followUpQuestions.length} -{' '}
                    {currentFollowUpFeedback.passed ? 'Passed!' : 'Needs Review'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {currentFollowUpIndex + 1 < feedback.followUpQuestions.length
                      ? 'One more follow-up question remaining'
                      : 'Finalizing your session...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Feedback for the follow-up */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Feedback</h3>

              {currentFollowUpFeedback.feedback.evaluation && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Evaluation</h4>
                  <p className="text-gray-600">{currentFollowUpFeedback.feedback.evaluation}</p>
                </div>
              )}

              {currentFollowUpFeedback.feedback.correction && currentFollowUpFeedback.feedback.correction !== 'N/A' && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Correction</h4>
                  <p className="text-gray-600">{currentFollowUpFeedback.feedback.correction}</p>
                </div>
              )}

              {currentFollowUpFeedback.feedback.interviewReadyAnswer && currentFollowUpFeedback.feedback.interviewReadyAnswer !== 'N/A' && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Interview-Ready Answer</h4>
                  <p className="text-gray-600">{currentFollowUpFeedback.feedback.interviewReadyAnswer}</p>
                </div>
              )}

              {currentFollowUpFeedback.feedback.higherLevelArticulation && currentFollowUpFeedback.feedback.higherLevelArticulation !== 'N/A' && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Higher-Level Articulation</h4>
                  <p className="text-gray-600">{currentFollowUpFeedback.feedback.higherLevelArticulation}</p>
                </div>
              )}
            </div>

            {/* Continue Button */}
            <button
              onClick={handleNext}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              {currentFollowUpIndex + 1 < feedback.followUpQuestions.length
                ? 'Next Follow-up'
                : 'Complete Session'}
            </button>
          </div>
        )}

        {/* Final Session Feedback */}
        {studyState === 'final_feedback' && finalResult && feedback && (
          <div className="space-y-6">
            {/* Final Result */}
            <div className={`rounded-lg p-6 border ${
              finalResult.passed
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  finalResult.passed ? 'bg-green-100' : 'bg-amber-100'
                }`}>
                  {finalResult.passed ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <h3 className={`text-xl font-semibold ${
                    finalResult.passed ? 'text-green-900' : 'text-amber-900'
                  }`}>
                    {finalResult.passed ? 'Great Job!' : 'Keep Practicing!'}
                  </h3>
                  <p className="text-sm text-gray-600">
                    You answered {followUpResults.length + 1} question{followUpResults.length > 0 ? 's' : ''} in this session
                  </p>
                </div>
              </div>

              {/* Box Progress */}
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Previous Box</div>
                  <div className="text-2xl font-bold text-gray-700">{finalResult.currentBox}</div>
                </div>
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="text-center">
                  <div className="text-sm text-gray-600">New Box</div>
                  <div className={`text-2xl font-bold ${
                    finalResult.newBox > finalResult.currentBox
                      ? 'text-green-600'
                      : finalResult.newBox < finalResult.currentBox
                      ? 'text-amber-600'
                      : 'text-gray-700'
                  }`}>
                    {finalResult.newBox}
                  </div>
                </div>
              </div>

              {/* Next Due Date */}
              <div className="text-center py-2 border-t border-gray-200 mt-4 pt-4">
                <p className="text-sm text-gray-600">Next review due</p>
                <p className="text-lg font-semibold text-gray-900">
                  {finalResult.nextDueDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            {/* Follow-up Results Summary */}
            {followUpResults.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow-up Results</h3>
                <div className="space-y-3">
                  {followUpResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.passed
                          ? 'bg-green-50 border-green-200'
                          : 'bg-amber-50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {result.passed ? (
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span className="text-sm font-medium text-gray-700">
                          Follow-up {index + 1}: {result.passed ? 'Passed' : 'Needs Review'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{result.question}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Question Button */}
            <button
              onClick={handleNext}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Next Question
            </button>
          </div>
        )}

        {/* Follow-up Questions Display */}
        {studyState === 'followup' && feedback && feedback.followUpQuestions.length > 0 && (
          <div className="space-y-6">
            {/* Follow-up Header */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-indigo-900">Follow-up Question</h2>
              <p className="text-sm text-indigo-700 mt-1">
                Question {currentFollowUpIndex + 1} of {feedback.followUpQuestions.length}
              </p>
              {studyMode === 'INTERVIEW' && (
                <p className="text-xs text-indigo-600 mt-2 italic">
                  Follow-ups are required in Interview Mode
                </p>
              )}
            </div>

            {/* Follow-up Question Display */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                  Follow-up
                </span>
                {studyMode === 'INTERVIEW' && (
                  <span className="ml-2 inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                    Required
                  </span>
                )}
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {feedback.followUpQuestions[currentFollowUpIndex].content}
              </h3>
              <p className="text-sm text-gray-500 italic">
                &ldquo;{feedback.followUpQuestions[currentFollowUpIndex].reason}&rdquo;
              </p>
            </div>

            {/* Answer Input for Follow-up */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <form
                key={`followup-${currentFollowUpIndex}`}
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const answer = formData.get('followup-answer') as string;
                  handleSubmitFollowUpAnswer(answer);
                }}
                className="space-y-4"
              >
                <div>
                  <label htmlFor="followup-answer" className="block text-sm font-medium text-gray-700 mb-2">
                    Your Answer
                  </label>
                  <textarea
                    id="followup-answer"
                    name="followup-answer"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    placeholder="Type your answer to the follow-up question..."
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Submit Answer
                  </button>
                  {studyMode === 'FREE' && (
                    <button
                      type="button"
                      onClick={handleSkipFollowUps}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                    >
                      Skip
                    </button>
                  )}
                  {studyMode === 'INTERVIEW' && (
                    <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium">
                      Cannot skip in Interview Mode
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {studyState === 'complete' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {studyMode === 'INTERVIEW' ? 'Interview Session Complete!' : 'Ready to Start Practicing!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {studyMode === 'INTERVIEW'
                ? 'You have completed the available questions for this session. Great progress!'
                : 'No questions due right now. Start a new session to generate fresh questions via AI!'}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setStudyState('loading');
                  // This will trigger LLM question generation
                  fetchQuestions();
                }}
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Start Practicing
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}

        {/* Career Selection Modal */}
        {showCareerSelector && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowCareerSelector(false)} />
            <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Select a Career Track</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Interview mode requires you to select a career track. Use the dropdown in the header to choose your career path.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCareerSelector(false);
                    setIsCareerSelectorOpen(true);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                >
                  Open Career Selector
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
