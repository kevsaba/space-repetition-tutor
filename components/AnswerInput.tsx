'use client';

/**
 * AnswerInput Component
 *
 * Textarea for user to input their answer with character count and submit button.
 */

import { useState } from 'react';

type DifficultyLevel = 'JUNIOR' | 'MID' | 'SENIOR' | 'EXPERT';

interface AnswerInputProps {
  onSubmit: (answer: string) => Promise<void>;
  loading?: boolean;
  onSkip?: () => void;
  onNewQuestion?: (difficulty: DifficultyLevel) => void;
  showSkip?: boolean;
  showNewQuestion?: boolean;
  currentDifficulty?: DifficultyLevel;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  JUNIOR: 'Easy',
  MID: 'Medium',
  SENIOR: 'Hard',
  EXPERT: 'Expert',
};

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  JUNIOR: 'bg-green-100 text-green-800 hover:bg-green-200',
  MID: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  SENIOR: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  EXPERT: 'bg-red-100 text-red-800 hover:bg-red-200',
};

export function AnswerInput({
  onSubmit,
  loading = false,
  onSkip,
  onNewQuestion,
  showSkip = false,
  showNewQuestion = false,
  currentDifficulty = 'MID',
}: AnswerInputProps) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim().length === 0) return;

    setSubmitting(true);
    try {
      await onSubmit(answer);
      setAnswer('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setAnswer('');
    onSkip?.();
  };

  const handleNewQuestionClick = () => {
    setShowDifficultyDropdown(!showDifficultyDropdown);
  };

  const handleDifficultySelect = (difficulty: DifficultyLevel) => {
    setShowDifficultyDropdown(false);
    setAnswer('');
    onNewQuestion?.(difficulty);
  };

  const isDisabled = answer.trim().length === 0 || submitting || loading;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
            Your Answer
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={submitting || loading}
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Type your answer here..."
          />
          <div className="mt-2 flex justify-between items-center">
            <p className="text-sm text-gray-500">
              {answer.length} characters
            </p>
            <p className={`text-sm ${answer.trim().length === 0 ? 'text-red-500' : 'text-green-500'}`}>
              {answer.trim().length === 0 ? 'Answer cannot be empty' : 'Ready to submit'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {showNewQuestion && onNewQuestion && (
            <div className="relative">
              <button
                type="button"
                onClick={handleNewQuestionClick}
                disabled={submitting || loading}
                className="px-4 py-3 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Question
                <svg className="w-3 h-3 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Difficulty Dropdown */}
              {showDifficultyDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowDifficultyDropdown(false)}
                  />
                  <div className="absolute z-20 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
                    <div className="p-2">
                      {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((diff) => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => handleDifficultySelect(diff)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors mb-1 last:mb-0 flex items-center justify-between ${
                            currentDifficulty === diff
                              ? 'ring-2 ring-indigo-500 ring-offset-1'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <span className={`font-medium ${
                            diff === 'JUNIOR'
                              ? 'text-green-700'
                              : diff === 'MID'
                              ? 'text-blue-700'
                              : diff === 'SENIOR'
                              ? 'text-orange-700'
                              : 'text-red-700'
                          }`}>
                            {DIFFICULTY_LABELS[diff]}
                          </span>
                          {currentDifficulty === diff && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              Current
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {showSkip && onSkip && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting || loading}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip Question
            </button>
          )}
          <button
            type="submit"
            disabled={isDisabled}
            className={`py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              showSkip && onSkip ? 'flex-1' : 'w-full'
            }`}
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        </div>
      </form>
    </div>
  );
}
