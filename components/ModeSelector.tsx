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
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    setMode(currentMode);
  }, [currentMode]);

  const handleModeChange = (newMode: StudyMode) => {
    if (disabled) return;

    // Check if user has an active career when switching to INTERVIEW mode
    if (newMode === 'INTERVIEW' && !hasActiveCareer) {
      setShowWarning(true);
      return;
    }

    setMode(newMode);
    onModeChange?.(newMode);
  };

  return (
    <div className={`inline-flex items-center bg-gray-100 rounded-lg p-1 ${className}`}>
      {/* FREE Mode */}
      <button
        onClick={() => handleModeChange('FREE')}
        disabled={disabled}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === 'FREE'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Free Practice
        </span>
      </button>

      {/* INTERVIEW Mode */}
      <button
        onClick={() => handleModeChange('INTERVIEW')}
        disabled={disabled}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
          mode === 'INTERVIEW'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          Interview Mode
        </span>
      </button>

      {/* Warning Modal */}
      {showWarning && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowWarning(false)} />
          <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Career Track Required</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Interview mode requires you to select a career track first. This allows us to guide you through topics in a structured order.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowWarning(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowWarning(false);
                  // Trigger career selector - parent component should handle this
                  onModeChange?.('INTERVIEW');
                }}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
              >
                Select Career
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
