'use client';

/**
 * BoxDistributionCard Component
 *
 * Displays a single box with its question count and review interval.
 * Uses color coding to differentiate between boxes.
 */

interface BoxDistributionCardProps {
  box: number;
  count: number;
  reviewInterval: string;
  colorClass: string;
  bgColorClass: string;
  borderColorClass: string;
  iconBgClass: string;
  iconColorClass: string;
}

export function BoxDistributionCard({
  box,
  count,
  reviewInterval,
  colorClass,
  bgColorClass,
  borderColorClass,
  iconBgClass,
  iconColorClass,
}: BoxDistributionCardProps) {
  return (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${borderColorClass} transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {/* Box Number Icon */}
          <div className={`w-14 h-14 rounded-full ${iconBgClass} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-2xl font-bold ${iconColorClass}`}>{box}</span>
          </div>

          {/* Box Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Box {box}</h3>
            <p className="text-sm text-gray-600">{reviewInterval}</p>
          </div>
        </div>

        {/* Question Count */}
        <div className={`text-3xl font-bold ${colorClass}`}>
          {count}
        </div>
      </div>

      {/* Progress bar visualization */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{count} question{count !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${bgColorClass} transition-all duration-500`}
            style={{
              width: `${Math.min(count * 10, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
