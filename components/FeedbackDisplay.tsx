'use client';

/**
 * FeedbackDisplay Component
 *
 * Displays detailed feedback after answer submission including:
 * - Pass/fail indicator
 * - Structured feedback from LLM
 * - New box level
 * - Next review date
 * - Follow-up questions (if any)
 * - "Next Question" button
 */

import { useState } from 'react';

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

interface FeedbackDisplayProps {
  passed: boolean;
  newBox: number;
  nextDueDate: Date;
  feedback: LLMFeedback;
  followUpQuestions?: FollowUpQuestion[];
  onNext: () => void;
  loading?: boolean;
  buttonText?: string;
}

export function FeedbackDisplay({
  passed,
  newBox,
  nextDueDate,
  feedback,
  followUpQuestions = [],
  onNext,
  loading = false,
  buttonText,
}: FeedbackDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getBoxColor = (box: number) => {
    switch (box) {
      case 1:
        return 'bg-red-100 text-red-800 border-red-200';
      case 2:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 3:
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBoxLabel = (box: number) => {
    switch (box) {
      case 1:
        return 'Box 1 - Review daily';
      case 2:
        return 'Box 2 - Review every 3 days';
      case 3:
        return 'Box 3 - Review weekly';
      default:
        return 'To be determined';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Pass/Fail Indicator */}
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${passed ? 'bg-green-100' : 'bg-red-100'}`}>
          {passed ? (
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div>
          <h3 className={`text-lg font-semibold ${passed ? 'text-green-800' : 'text-red-800'}`}>
            {passed ? 'Passed!' : 'Keep practicing'}
          </h3>
          <p className={`text-sm ${passed ? 'text-green-600' : 'text-red-600'}`}>
            {passed ? 'Great job! Moving to the next box.' : 'Review this question again tomorrow.'}
          </p>
        </div>
      </div>

      {/* Box Level Info */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Your Progress</h4>
        <div className={`inline-flex items-center px-4 py-2 rounded-lg border ${getBoxColor(newBox)}`}>
          <span className="font-medium">{getBoxLabel(newBox)}</span>
        </div>
      </div>

      {/* Evaluation Summary */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Evaluation</h4>
        <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{feedback.evaluation}</p>
      </div>

      {/* Expandable Details */}
      <div className="mb-6">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {showDetails ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Hide Details
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Show Details
            </>
          )}
        </button>

        {showDetails && (
          <div className="mt-4 space-y-4">
            {/* Higher Level Articulation */}
            {feedback.higherLevelArticulation && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h5 className="text-sm font-semibold text-blue-900 mb-2">Senior-Level Answer</h5>
                <p className="text-sm text-blue-800">{feedback.higherLevelArticulation}</p>
              </div>
            )}

            {/* Corrections */}
            {feedback.correction && feedback.correction !== 'N/A' && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <h5 className="text-sm font-semibold text-amber-900 mb-2">Corrections</h5>
                <p className="text-sm text-amber-800">{feedback.correction}</p>
              </div>
            )}

            {/* Interview-Ready Answer */}
            {feedback.interviewReadyAnswer && feedback.interviewReadyAnswer !== 'N/A' && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h5 className="text-sm font-semibold text-green-900 mb-2">Interview-Ready Answer</h5>
                <p className="text-sm text-green-800">{feedback.interviewReadyAnswer}</p>
              </div>
            )}

            {/* Analogy */}
            {feedback.analogy && feedback.analogy !== 'N/A' && (
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <h5 className="text-sm font-semibold text-purple-900 mb-2">Memorable Analogy</h5>
                <p className="text-sm text-purple-800">{feedback.analogy}</p>
              </div>
            )}

            {/* Production Insight */}
            {feedback.productionInsight && feedback.productionInsight !== 'N/A' && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Real-World Insight</h5>
                <p className="text-sm text-gray-800">{feedback.productionInsight}</p>
              </div>
            )}

            {/* Failure Timeline */}
            {feedback.failureTimeline && feedback.failureTimeline !== 'N/A' && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h5 className="text-sm font-semibold text-red-900 mb-2">Why This Matters</h5>
                <p className="text-sm text-red-800">{feedback.failureTimeline}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-up Questions */}
      {followUpQuestions.length > 0 && (
        <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <h4 className="text-sm font-semibold text-indigo-900 mb-3">
            Follow-up Questions ({followUpQuestions.length})
          </h4>
          <p className="text-sm text-indigo-700 mb-3">
            These follow-ups will appear after you click &ldquo;Next Question&rdquo;.
          </p>
          <div className="space-y-2">
            {followUpQuestions.map((fq, index) => (
              <div key={index} className="bg-white p-3 rounded border border-indigo-100">
                <p className="text-sm font-medium text-gray-900">{fq.content}</p>
                <p className="text-xs text-gray-500 mt-1">{fq.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next Review Date */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Next Review</h4>
        <p className="text-gray-900">{formatDate(nextDueDate)}</p>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : buttonText || 'Next Question'}
      </button>
    </div>
  );
}
