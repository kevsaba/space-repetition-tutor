'use client';

/**
 * ModeSelector Component
 *
 * Allows users to switch between FREE and INTERVIEW study modes.
 * FREE: Explore topics freely using Leitner system
 * INTERVIEW: Structured preparation following career track order
 */

import { useState, useEffect } from 'react';

type StudyMode = 'FREE' | 'INTERVIEW';

interface ModeSelectorProps {
  currentMode?: StudyMode;
  onModeChange?: (mode: StudyMode) => void;
  hasActiveCareer?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ModeSelector({
  currentMode = 'FREE',
  onModeChange,
  hasActiveCareer = false,
  disabled = false,
  className = '',
}: ModeSelectorProps) {
  const [mode, setMode] = useState<StudyMode>(currentMode);

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const handleModeChange = (newMode: StudyMode) => {
    if (disabled) return;

    // If switching to INTERVIEW mode without an active career, just call the parent
    // The parent will handle showing the career selector
    setMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      {/* FREE Mode - Green when active */}
      <button
        onClick={() => handleModeChange('FREE')}
        disabled={disabled}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === 'FREE'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Free Practice
        </span>
      </button>

      {/* INTERVIEW Mode - Purple when active */}
      <button
        onClick={() => handleModeChange('INTERVIEW')}
        disabled={disabled}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === 'INTERVIEW'
            ? 'bg-violet-600 text-white shadow-sm'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Interview Mode
        </span>
      </button>
    </div>
  );
}
