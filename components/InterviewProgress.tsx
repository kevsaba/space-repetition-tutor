'use client';

/**
 * InterviewProgress Component
 *
 * Displays progress tracking for INTERVIEW mode:
* - Current topic in the career sequence
 * - Questions answered/remaining in current topic
 * - Topics completed/remaining in career
 * - Visual progress bar
 */

interface InterviewProgressProps {
  currentTopicIndex?: number;
  totalTopics?: number;
  currentTopicName?: string;
  questionsAnswered?: number;
  questionsPerTopic?: number;
  className?: string;
}

export function InterviewProgress({
  currentTopicIndex = 1,
  totalTopics = 15,
  currentTopicName = 'Java Concurrency',
  questionsAnswered = 2,
  questionsPerTopic = 5,
  className = '',
}: InterviewProgressProps) {
  // Calculate progress percentages
  const topicProgress = Math.min((questionsAnswered / questionsPerTopic) * 100, 100);
  const overallProgress = ((currentTopicIndex - 1) / totalTopics) * 100 + (topicProgress / totalTopics);

  return (
    <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">Interview Progress</span>
        </div>
        <span className="text-sm text-gray-500">
          Topic {currentTopicIndex} of {totalTopics}
        </span>
      </div>

      {/* Current Topic Name */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Current Topic</p>
        <p className="text-sm font-medium text-gray-900">{currentTopicName}</p>
      </div>

      {/* Overall Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Overall Progress</span>
          <span className="text-xs font-medium text-gray-900">
            {Math.round(overallProgress)}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

      {/* Topic Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Topic Progress</span>
          <span className="text-xs font-medium text-gray-900">
            {questionsAnswered} / {questionsPerTopic} questions
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-green-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${topicProgress}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
        <div className="text-center">
          <p className="text-lg font-semibold text-indigo-600">{currentTopicIndex}</p>
          <p className="text-xs text-gray-500">Current Topic</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-green-600">{questionsAnswered}</p>
          <p className="text-xs text-gray-500">Answered</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-600">{totalTopics - currentTopicIndex}</p>
          <p className="text-xs text-gray-500">Remaining</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version of progress indicator for use in headers
 */
interface CompactProgressProps {
  currentTopicIndex?: number;
  totalTopics?: number;
  currentTopicName?: string;
  className?: string;
}

export function CompactProgress({
  currentTopicIndex = 1,
  totalTopics = 15,
  currentTopicName,
  className = '',
}: CompactProgressProps) {
  const progress = ((currentTopicIndex - 1) / totalTopics) * 100;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {currentTopicName && (
        <div className="hidden sm:block">
          <span className="text-xs text-gray-500">Current:</span>
          <span className="text-sm font-medium text-gray-900 ml-1">{currentTopicName}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="w-32 bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-600 whitespace-nowrap">
          {currentTopicIndex}/{totalTopics}
        </span>
      </div>
    </div>
  );
}
