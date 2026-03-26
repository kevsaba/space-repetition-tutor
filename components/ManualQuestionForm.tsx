'use client';

/**
 * ManualQuestionForm Component
 *
 * Allows users to manually add questions with:
 * - Searchable topic selector (select from existing or create new)
 * - Career selector dropdown (add to any of user's careers)
 * - Single question entry
 */

import { useState, useEffect } from 'react';

interface ManualQuestionFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Topic {
  id: string;
  name: string;
  category: string;
  track: string;
}

interface UserCareer {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

interface FormError {
  field: string;
  message: string;
}

const QUESTION_TEXT_MIN_LENGTH = 10;
const QUESTION_TEXT_MAX_LENGTH = 1000;

export function ManualQuestionForm({
  onSuccess,
  onCancel,
}: ManualQuestionFormProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [careers, setCareers] = useState<UserCareer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [selectedCareerId, setSelectedCareerId] = useState<string | null>(null);

  // Errors
  const [errors, setErrors] = useState<FormError[]>([]);
  const [submitError, setSubmitError] = useState('');

  // UI state
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);

  // Fetch topics and careers on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicsRes, careersRes] = await Promise.all([
          fetch('/api/topics'),
          fetch('/api/careers/my-careers'),
        ]);

        if (topicsRes.ok) {
          const topicsData = await topicsRes.json();
          setTopics(topicsData.topics || []);
        }

        if (careersRes.ok) {
          const careersData = await careersRes.json();
          setCareers(careersData.careers || []);
          // Pre-select active career if exists
          const activeCareer = careersData.careers?.find((c: UserCareer) => c.isActive);
          if (activeCareer) {
            setSelectedCareerId(activeCareer.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter topics based on search query
  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle topic selection from dropdown
  const handleSelectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    setSearchQuery(topic.name);
    setShowTopicDropdown(false);
    setShowCreateTopic(false);
    setErrors(errors.filter((e) => e.field !== 'topic'));
  };

  // Handle create new topic
  const handleCreateTopic = () => {
    setShowCreateTopic(true);
    setShowTopicDropdown(false);
    setNewTopicName(searchQuery);
    setErrors(errors.filter((e) => e.field !== 'topic'));
  };

  // Handle career selection
  const handleSelectCareer = (careerId: string) => {
    setSelectedCareerId(careerId);
    setShowCareerDropdown(false);
    setErrors(errors.filter((e) => e.field !== 'career'));
  };

  const validate = (): boolean => {
    const newErrors: FormError[] = [];

    // Validate topic (either selected or new)
    if (!showCreateTopic && !selectedTopic) {
      newErrors.push({ field: 'topic', message: 'Please select a topic or create a new one' });
    }
    if (showCreateTopic && newTopicName.trim().length < 2) {
      newErrors.push({ field: 'topic', message: 'Topic name must be at least 2 characters' });
    }

    // Validate question
    if (!questionText.trim()) {
      newErrors.push({ field: 'question', message: 'Question text is required' });
    } else if (questionText.trim().length < QUESTION_TEXT_MIN_LENGTH) {
      newErrors.push({
        field: 'question',
        message: `Must be at least ${QUESTION_TEXT_MIN_LENGTH} characters`,
      });
    } else if (questionText.trim().length > QUESTION_TEXT_MAX_LENGTH) {
      newErrors.push({
        field: 'question',
        message: `Must not exceed ${QUESTION_TEXT_MAX_LENGTH} characters`,
      });
    }

    // Validate career
    if (!selectedCareerId) {
      newErrors.push({ field: 'career', message: 'Please select a career' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicName: showCreateTopic ? newTopicName.trim() : selectedTopic?.name,
          questionText: questionText.trim(),
          careerId: selectedCareerId,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: { message: 'Failed to add question' } }));
        throw new Error(data.error?.message || 'Failed to add question');
      }

      // Reset form on success
      setSelectedTopic(null);
      setSearchQuery('');
      setShowCreateTopic(false);
      setNewTopicName('');
      setQuestionText('');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add question';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getErrorForField = (field: string) => {
    return errors.find((e) => e.field === field);
  };

  const getSelectedCareer = () => careers.find((c) => c.id === selectedCareerId);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add Question Manually</h3>
          <p className="text-sm text-gray-500">Add a question to your study set</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-4">
        {/* Topic Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Topic <span className="text-red-500">*</span>
          </label>

          {showCreateTopic ? (
            // Create new topic input
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTopicName}
                  onChange={(e) => {
                    setNewTopicName(e.target.value);
                    setSearchQuery(e.target.value);
                  }}
                  placeholder="Enter new topic name..."
                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    getErrorForField('topic') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateTopic(false);
                    setShowTopicDropdown(true);
                  }}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Select Existing
                </button>
              </div>
              <p className="text-xs text-gray-500">
                Creating new topic: <span className="font-medium">{newTopicName}</span>
              </p>
            </div>
          ) : (
            // Searchable dropdown
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowTopicDropdown(true);
                    }}
                    onFocus={() => setShowTopicDropdown(true)}
                    placeholder="Search or create a topic..."
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                      getErrorForField('topic') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={submitting || loading}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTopic(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Dropdown */}
              {showTopicDropdown && !loading && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowTopicDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredTopics.length > 0 ? (
                      filteredTopics.map((topic) => (
                        <button
                          key={topic.id}
                          type="button"
                          onClick={() => handleSelectTopic(topic)}
                          className="w-full px-3 py-2 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0"
                        >
                          <div className="font-medium text-gray-900">{topic.name}</div>
                          <div className="text-xs text-gray-500">{topic.category}</div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-3 text-center">
                        <p className="text-sm text-gray-500 mb-2">No topics found</p>
                        <button
                          type="button"
                          onClick={handleCreateTopic}
                          className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
                        >
                          Create &quot;{searchQuery}&quot; as new topic
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {getErrorForField('topic') && (
            <p className="mt-1 text-xs text-red-600">{getErrorForField('topic')?.message}</p>
          )}
        </div>

        {/* Career Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Add to Career <span className="text-red-500">*</span>
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCareerDropdown(!showCareerDropdown)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-left flex items-center justify-between ${
                getErrorForField('career') ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={submitting || loading}
            >
              <span className={getSelectedCareer() ? 'text-gray-900' : 'text-gray-500'}>
                {loading ? 'Loading careers...' : getSelectedCareer()?.name || 'Select a career...'}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Career Dropdown */}
            {showCareerDropdown && !loading && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCareerDropdown(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {careers.length > 0 ? (
                    careers.map((career) => (
                      <button
                        key={career.id}
                        type="button"
                        onClick={() => handleSelectCareer(career.id)}
                        className="w-full px-3 py-2 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0 flex items-center justify-between"
                      >
                        <span className="font-medium text-gray-900">{career.name}</span>
                        {career.isActive && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-center text-sm text-gray-500">
                      No careers found. Upload a CSV/Excel to create one.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {getErrorForField('career') && (
            <p className="mt-1 text-xs text-red-600">{getErrorForField('career')?.message}</p>
          )}
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Question <span className="text-red-500">*</span>
          </label>
          <textarea
            value={questionText}
            onChange={(e) => {
              setQuestionText(e.target.value);
              setErrors(errors.filter((e) => e.field !== 'question'));
            }}
            placeholder="Enter your interview question..."
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none ${
              getErrorForField('question') ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={submitting}
          />
          {getErrorForField('question') && (
            <p className="mt-1 text-xs text-red-600">{getErrorForField('question')?.message}</p>
          )}
        </div>

        {/* Global Error */}
        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Submit/Cancel Buttons */}
        <div className="flex gap-3 border-t border-gray-200 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Adding...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Add Question
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
