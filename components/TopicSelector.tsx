'use client';

/**
 * TopicSelector Component
 *
 * Displays a dropdown/modal for selecting topics in Free Practice mode.
 * Shows the active topic and allows switching to another topic or creating a new one.
 */

import { useState, useEffect } from 'react';

interface Topic {
  id: string;
  name: string;
  category: string;
  track: string;
}

interface TopicSelectorProps {
  onTopicChange: (topicId: string | null) => void;
  selectedTopicId?: string | null;
  className?: string;
}

export function TopicSelector({
  onTopicChange,
  className = '',
}: TopicSelectorProps) {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [internalSelectedTopicId, setInternalSelectedTopicId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');

  // Create new topic state
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [creating, setCreating] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Use controlled or uncontrolled state
  const selectedTopicId = internalSelectedTopicId;

  // Fetch topics on mount
  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const response = await fetch('/api/topics');
        if (response.ok) {
          const data = await response.json();
          setTopics(data.topics || []);
        } else {
          // Handle error
          console.error('Failed to fetch topics');
        }
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopics();
  }, []);

  // Filter topics based on search query
  const filteredTopics = topics.filter((topic) =>
    topic.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectTopic = async (topicId: string) => {
    setSwitching(true);
    setError('');

    try {
      setInternalSelectedTopicId(topicId);
      setIsOpen(false);
      setSearchQuery('');
      setShowCreateTopic(false);
      onTopicChange(topicId);
    } catch (err) {
      console.error('Failed to select topic:', err);
      setError('Failed to select topic. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

  const handleClearSelection = () => {
    setInternalSelectedTopicId(null);
    setIsOpen(false);
    setSearchQuery('');
    setShowCreateTopic(false);
    onTopicChange(null);
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || newTopicName.trim().length < 2) {
      setError('Topic name must be at least 2 characters');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: { message: 'Failed to create topic' } }));
        throw new Error(data.error?.message || 'Failed to create topic');
      }

      const data = await response.json();
      const newTopic = data.topic;

      // Add to topics list
      setTopics([...topics, newTopic]);

      // Select the new topic
      setInternalSelectedTopicId(newTopic.id);
      setIsOpen(false);
      setSearchQuery('');
      setNewTopicName('');
      setShowCreateTopic(false);
      onTopicChange(newTopic.id);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create topic';
      setError(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const getSelectedTopic = () => topics.find((t) => t.id === selectedTopicId);

  // Show loading spinner when switching topics
  if (switching) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg w-80 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded-lg h-10 w-48 ${className}`}></div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-80"
      >
        <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        <span className="font-medium text-gray-700 truncate flex-1 text-left">
          {getSelectedTopic()?.name || 'All Topics'}
        </span>
        {selectedTopicId && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClearSelection();
            }}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
            title="Clear selection"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute z-20 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Select Topic</h3>
              <p className="text-xs text-gray-500 mt-1">Focus your practice on a specific topic</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border-b border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Search Input */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowCreateTopic(false);
                  }}
                  placeholder="Search topics..."
                  className="w-full px-3 py-2 pl-9 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  autoFocus
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setShowCreateTopic(false);
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

            {/* Topic List or Create New */}
            <div className="p-2">
              {showCreateTopic ? (
                // Create new topic form
                <div className="p-3">
                  <p className="text-sm text-gray-600 mb-2">
                    Create new topic: <span className="font-medium text-indigo-600">{searchQuery || 'Enter topic name below'}</span>
                  </p>
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="Enter topic name..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
                    autoFocus
                    disabled={creating}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTopic}
                      disabled={creating || !newTopicName.trim() || newTopicName.trim().length < 2}
                      className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creating ? 'Creating...' : 'Create Topic'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateTopic(false);
                        setNewTopicName('');
                        setSearchQuery('');
                      }}
                      disabled={creating}
                      className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* "All Topics" option to clear selection */}
                  <button
                    onClick={() => handleClearSelection()}
                    disabled={switching}
                    className={`w-full text-left p-3 rounded-lg transition-colors mb-1 ${
                      !selectedTopicId
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="font-medium text-gray-900">All Topics</span>
                      {!selectedTopicId && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-7">Practice questions from all topics</p>
                  </button>

                  {/* Topic list */}
                  {filteredTopics.length > 0 ? (
                    filteredTopics.map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => handleSelectTopic(topic.id)}
                        disabled={switching}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedTopicId === topic.id
                            ? 'bg-indigo-50 border border-indigo-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{topic.name}</span>
                              {selectedTopicId === topic.id && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{topic.category}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : searchQuery ? (
                    // No topics found - offer to create new
                    <div className="p-3 text-center">
                      <p className="text-sm text-gray-500 mb-2">No topics found</p>
                      <button
                        onClick={() => {
                          setShowCreateTopic(true);
                          setNewTopicName(searchQuery);
                        }}
                        className="text-indigo-600 text-sm font-medium hover:text-indigo-700"
                      >
                        Create "{searchQuery}" as new topic
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No topics available
                    </div>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-200 my-2 mx-2" />

                  {/* Always show "Create new topic" button */}
                  <button
                    onClick={() => {
                      setShowCreateTopic(true);
                      setSearchQuery('');
                      setNewTopicName('');
                    }}
                    disabled={switching}
                    className="w-full text-left p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 border border-transparent transition-colors flex items-center gap-2 ${switching ? 'opacity-50 cursor-not-allowed' : ''}"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm font-medium">Create new topic</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
