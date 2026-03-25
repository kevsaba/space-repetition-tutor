'use client';

/**
 * ReviewSchedule Component
 *
 * Displays the Leitner system review schedule with visual timeline.
 * Explains the box intervals and when to review.
 */

export function ReviewSchedule() {
  const scheduleItems = [
    {
      box: 1,
      interval: 'Daily',
      description: 'Review every day to strengthen weak areas',
      colorClass: 'bg-amber-500',
      textColorClass: 'text-amber-700',
      bgColorClass: 'bg-amber-50',
      borderColorClass: 'border-amber-200',
    },
    {
      box: 2,
      interval: 'Every 3 days',
      description: 'Building retention with spaced repetition',
      colorClass: 'bg-blue-500',
      textColorClass: 'text-blue-700',
      bgColorClass: 'bg-blue-50',
      borderColorClass: 'border-blue-200',
    },
    {
      box: 3,
      interval: 'Weekly',
      description: 'Maintenance mode for well-learned concepts',
      colorClass: 'bg-green-500',
      textColorClass: 'text-green-700',
      bgColorClass: 'bg-green-50',
      borderColorClass: 'border-green-200',
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Review Schedule</h2>
      <p className="text-sm text-gray-600 mb-6">
        The Leitner system uses spaced repetition to optimize your learning. Questions move between boxes based on your performance.
      </p>

      {/* Timeline */}
      <div className="space-y-4">
        {scheduleItems.map((item) => (
          <div key={item.box} className={`flex items-start gap-4 p-4 rounded-lg border ${item.bgColorClass} ${item.borderColorClass}`}>
            {/* Timeline dot */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full ${item.colorClass} flex items-center justify-center flex-shrink-0`}>
                <span className="text-sm font-bold text-white">{item.box}</span>
              </div>
              {item.box < 3 && (
                <div className="w-0.5 h-8 bg-gray-300 mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className={`font-semibold ${item.textColorClass}`}>Box {item.box}</h3>
                <span className={`text-sm font-medium ${item.textColorClass}`}>{item.interval}</span>
              </div>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>

            {/* Arrow for progression */}
            {item.box < 3 && (
              <div className="flex items-center">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">How it works</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span><strong>Pass:</strong> Question moves to the next box (or stays in Box 3)</span>
          </li>
          <li className="flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span><strong>Fail:</strong> Question returns to Box 1 for daily review</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
