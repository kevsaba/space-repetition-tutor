'use client';

/**
 * FeedbackDisplay Component
 *
 * Displays feedback after answer submission including:
 * - Pass/fail indicator
 * - New box level
 * - Next review date
 * - "Next Question" button
 *
 * Phase 1: Simplified feedback (no detailed feedback until Phase 2 with LLM)
 */

interface FeedbackDisplayProps {
  passed: boolean;
  newBox: number;
  nextDueDate: Date;
  onNext: () => void;
  loading?: boolean;
}

export function FeedbackDisplay({ passed, newBox, nextDueDate, onNext, loading = false }: FeedbackDisplayProps) {
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
        return 'Box unknown';
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

      {/* Next Review Date */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Next Review</h4>
        <p className="text-gray-900">{formatDate(nextDueDate)}</p>
      </div>

      {/* Phase 1 Note */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          <strong>Note:</strong> Detailed AI feedback will be available in Phase 2.
          For now, answers are automatically marked as passed for demonstration.
        </p>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={loading}
        className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : 'Next Question'}
      </button>
    </div>
  );
}
