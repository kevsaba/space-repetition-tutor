'use client';

/**
 * AnswerInput Component
 *
 * Textarea for user to input their answer with character count and submit button.
 */

import { useState } from 'react';

interface AnswerInputProps {
  onSubmit: (answer: string) => Promise<void>;
  loading?: boolean;
}

export function AnswerInput({ onSubmit, loading = false }: AnswerInputProps) {
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

        <button
          type="submit"
          disabled={isDisabled}
          className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </form>
    </div>
  );
}
