'use client';

/**
 * QuestionDisplay Component
 *
 * Displays a question with its metadata (topic, box level, etc.)
 */

interface QuestionDisplayProps {
  question: {
    id: string;
    content: string;
    topic: {
      name: string;
      category: string;
      track: string;
    };
    box: number;
    isNew: boolean;
  };
}

export function QuestionDisplay({ question }: QuestionDisplayProps) {
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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header with metadata */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
          {question.topic.name}
        </span>
        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
          {question.topic.category}
        </span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getBoxColor(question.box)}`}>
          {getBoxLabel(question.box)}
        </span>
        {question.isNew && (
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            New question
          </span>
        )}
      </div>

      {/* Question content */}
      <div className="prose max-w-none">
        <h3 className="text-xl font-semibold text-gray-900">{question.content}</h3>
      </div>
    </div>
  );
}
