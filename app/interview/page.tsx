'use client';

/**
 * Interview Mode Page - Dedicated page for structured interview preparation
 *
 * Follows a career track order for structured preparation.
 * Users must have an active career selected to use this mode.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { QuestionDisplay } from '@/components/QuestionDisplay';
import { AnswerInput } from '@/components/AnswerInput';
import { FeedbackDisplay } from '@/components/FeedbackDisplay';
import { CareerSelector } from '@/components/CareerSelector';
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
  | 'no_career'
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

// Always in INTERVIEW mode
const studyMode = 'INTERVIEW' as const;

export default function InterviewModePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Interview mode state
  const [hasActiveCareer, setHasActiveCareer] = useState(false);
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
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
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

  // Check for active career on mount
  useEffect(() => {
    const checkActiveCareer = async () => {
      if (!user) return;

      try {
        const response = await fetch('/api/careers/active');
        if (response.ok) {
          const data = await response.json();
          setHasActiveCareer(true);
          // Has active career, fetch questions
          await fetchQuestions();
        } else {
          // No active career, show career selector
          setHasActiveCareer(false);
          setStudyState('no_career');
        }
      } catch (err) {
        console.error('Error checking active career:', err);
        setHasActiveCareer(false);
        setStudyState('no_career');
      }
    };

    checkActiveCareer();
  }, [user]);

  const fetchQuestions = async () => {
    setStudyState('loading');
    setError('');

    const params = new URLSearchParams({
      limit: '10',
      sessionId: sessionId || '',
      mode: 'INTERVIEW',
    });

    try {
      const response = await fetch(`/api/questions/due?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }

      const data = await response.json();

      if (data.questions.length === 0) {
        if (questionQueue.length > 0) {
          setCurrentQuestion(questionQueue[0]);
          setQuestionQueue(questionQueue.slice(1));
          setStudyState('question');
        } else {
          setStudyState('complete');
        }
      } else {
        setQuestionQueue(data.questions.slice(1));
        setCurrentQuestion(data.questions[0]);
        setSessionId(data.sessionId);
        setStudyState('question');

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
          mode: 'INTERVIEW',
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

      if (data.followUpQuestions && data.followUpQuestions.length > 0) {
        setStudyState('feedback');
      } else {
        setStudyState('feedback');
      }
      setRetryCount(0);
    } catch (err) {
      console.error('Submit answer error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(errorMessage);

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
    if (studyState === 'feedback' && feedback && feedback.followUpQuestions.length > 0) {
      setStudyState('followup');
      return;
    }

    if (studyState === 'followup_feedback') {
      if (currentFollowUpIndex + 1 < feedback!.followUpQuestions.length) {
        setCurrentFollowUpIndex(currentFollowUpIndex + 1);
        setCurrentFollowUpFeedback(null);
        setStudyState('followup');
      } else {
        handleCompleteSession();
      }
      return;
    }

    if (studyState === 'final_feedback') {
      setFeedback(null);
      setCurrentFollowUpIndex(0);
      setFollowUpResults([]);
      setCurrentFollowUpFeedback(null);
      setFinalResult(null);

      if (questionQueue.length > 0) {
        setCurrentQuestion(questionQueue[0]);
        setQuestionQueue(questionQueue.slice(1));
        setStudyState('question');
      } else {
        setCurrentQuestion(null);
        fetchQuestions();
      }
      return;
    }

    if (studyState === 'feedback') {
      setFeedback(null);
      setCurrentFollowUpIndex(0);

      if (questionQueue.length > 0) {
        setCurrentQuestion(questionQueue[0]);
        setQuestionQueue(questionQueue.slice(1));
        setStudyState('question');
      } else {
        setCurrentQuestion(null);
        fetchQuestions();
      }
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

  const handleCareerSelected = () => {
    setHasActiveCareer(true);
    setIsCareerSelectorOpen(false);
    fetchQuestions();
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
      {/* Header - Career Selector and Progress */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Interview Mode</h1>
            <p className="text-sm text-gray-500 mt-1">Structured preparation following your career track</p>
          </div>
          <div className="flex items-center gap-3">
            <CareerSelector
              onCareerChange={handleCareerSelected}
              studyMode="INTERVIEW"
              isOpen={isCareerSelectorOpen}
              onOpenChange={setIsCareerSelectorOpen}
              className="ring-2 ring-indigo-200"
            />
            {interviewProgress && (
              <CompactProgress
                currentTopicIndex={interviewProgress.currentTopicIndex}
                totalTopics={interviewProgress.totalTopics}
                currentTopicName={interviewProgress.currentTopicName}
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-8 py-8">
        {/* No Career State */}
        {studyState === 'no_career' && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Career Track</h2>
            <p className="text-gray-600 mb-6">
              Interview mode requires you to select a career track to follow a structured preparation path.
            </p>
            <button
              onClick={() => setIsCareerSelectorOpen(true)}
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Choose Career Track
            </button>
          </div>
        )}

        {/* Interview Progress Card */}
        {studyState !== 'no_career' && studyState !== 'loading' && studyState !== 'error' && studyState !== 'complete' && interviewProgress && (
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
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-indigo-900">Follow-up Question</h2>
              <p className="text-sm text-indigo-700 mt-1">
                Question {currentFollowUpIndex + 1} of {feedback.followUpQuestions.length}
              </p>
              <p className="text-xs text-indigo-600 mt-2 italic">
                Follow-ups are required in Interview Mode
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-4">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                  Follow-up
                </span>
                <span className="ml-2 inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                  Required
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {feedback.followUpQuestions[currentFollowUpIndex].content}
              </h3>
              <p className="text-sm text-gray-500 italic">
                &ldquo;{feedback.followUpQuestions[currentFollowUpIndex].reason}&rdquo;
              </p>
            </div>

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
                  <div className="px-6 py-3 bg-gray-100 text-gray-500 rounded-lg font-medium">
                    Cannot skip in Interview Mode
                  </div>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Session Complete!</h2>
            <p className="text-gray-600 mb-6">
              You have completed the available questions for this session. Great progress!
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setStudyState('loading');
                  fetchQuestions();
                }}
                className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Continue Practicing
              </button>
              <Link
                href="/dashboard"
                className="px-8 py-4 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
