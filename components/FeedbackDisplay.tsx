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
 * - Thumbs up/down ratings for questions and feedback (for LLM steering)
 */

import { useState } from 'react';

type Rating = 'THUMBS_UP' | 'THUMBS_DOWN';

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
  answerId?: string; // For submitting ratings
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
  answerId,
}: FeedbackDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [questionRating, setQuestionRating] = useState<Rating | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<Rating | null>(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

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
    const dateObj = new Date(date);
    // Check if date is invalid
    if (isNaN(dateObj.getTime())) {
      return 'Not yet scheduled';
    }
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleRate = async (type: 'questionRating' | 'feedbackRating', value: Rating) => {
    if (!answerId) return;

    // Update local state immediately for responsiveness
    if (type === 'questionRating') {
      setQuestionRating(value);
    } else {
      setFeedbackRating(value);
    }

    // Submit asynchronously - don't block the UI
    setRatingSubmitting(true);
    try {
      const response = await fetch(`/api/answers/${answerId}/feedback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Ensure cookies are sent
        body: JSON.stringify({ [type]: value }),
      });

      if (!response.ok) {
        console.error('Failed to submit rating');
        // Revert state on error
        if (type === 'questionRating') {
          setQuestionRating((prev) => (prev === value ? null : prev));
        } else {
          setFeedbackRating((prev) => (prev === value ? null : prev));
        }
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      // Revert state on error
      if (type === 'questionRating') {
        setQuestionRating((prev) => (prev === value ? null : prev));
      } else {
        setFeedbackRating((prev) => (prev === value ? null : prev));
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  const ThumbsUpIcon = ({ selected }: { selected: boolean }) => (
    <svg
      className={`w-5 h-5 ${selected ? 'text-green-600 fill-green-600' : 'text-gray-400 hover:text-green-600'}`}
      fill={selected ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  );

  const ThumbsDownIcon = ({ selected }: { selected: boolean }) => (
    <svg
      className={`w-5 h-5 ${selected ? 'text-red-600 fill-red-600' : 'text-gray-400 hover:text-red-600'}`}
      fill={selected ? 'currentColor' : 'none'}
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10H2a2 2 0 00-2 2v6a2 2 0 002 2h2.5" />
    </svg>
  );

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
          <p className="text-sm text-indigo-700">
            <span className="font-semibold text-indigo-900">Follow-up questions coming!</span> Click "Next" to continue.
          </p>
        </div>
      )}

      {/* Next Review Date */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Next Review</h4>
        <p className="text-gray-900">{formatDate(nextDueDate)}</p>
      </div>

      {/* Bottom Section: Ratings and Next Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {/* Rating Buttons - only show if answerId is provided */}
        {answerId && (
          <div className="flex items-center gap-4 flex-wrap">
            {/* Question Rating */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rate question:</span>
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => handleRate('questionRating', 'THUMBS_UP')}
                  disabled={ratingSubmitting}
                  className="relative p-2 rounded hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  aria-label="Thumbs up for question"
                >
                  <ThumbsUpIcon selected={questionRating === 'THUMBS_UP'} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    I liked this question
                  </span>
                </button>
                <button
                  onClick={() => handleRate('questionRating', 'THUMBS_DOWN')}
                  disabled={ratingSubmitting}
                  className="relative p-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  aria-label="Thumbs down for question"
                >
                  <ThumbsDownIcon selected={questionRating === 'THUMBS_DOWN'} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Too difficult or unclear
                  </span>
                </button>
              </div>
            </div>

            {/* Feedback Rating */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Rate feedback:</span>
              <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => handleRate('feedbackRating', 'THUMBS_UP')}
                  disabled={ratingSubmitting}
                  className="relative p-2 rounded hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  aria-label="Thumbs up for feedback"
                >
                  <ThumbsUpIcon selected={feedbackRating === 'THUMBS_UP'} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Helpful feedback
                  </span>
                </button>
                <button
                  onClick={() => handleRate('feedbackRating', 'THUMBS_DOWN')}
                  disabled={ratingSubmitting}
                  className="relative p-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                  aria-label="Thumbs down for feedback"
                >
                  <ThumbsDownIcon selected={feedbackRating === 'THUMBS_DOWN'} />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    Too complex or unclear
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next Button */}
        <button
          onClick={onNext}
          disabled={loading}
          className="flex-1 sm:flex-none sm:w-auto px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : buttonText || 'Next Question'}
        </button>
      </div>
    </div>
  );
}
