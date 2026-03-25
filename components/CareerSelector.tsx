'use client';

/**
 * CareerSelector Component
 *
 * Displays a dropdown/modal for selecting career tracks.
 * Shows the active career and allows switching to another career.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Career {
  id: string;
  name: string;
  description: string;
  topicCount?: number;
}

interface UserCareer {
  id: string;
  career: Career;
  isActive: boolean;
  startedAt: string;
}

interface CareerSelectorProps {
  onCareerChange?: (careerId: string) => void;
  className?: string;
  studyMode?: 'FREE' | 'INTERVIEW';
  showUploadButton?: boolean;
}

export function CareerSelector({ onCareerChange, className = '', studyMode = 'INTERVIEW', showUploadButton = true }: CareerSelectorProps) {
  const router = useRouter();
  const [careers, setCareers] = useState<Career[]>([]);
  const [activeCareer, setActiveCareer] = useState<UserCareer | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  // Track if we've already loaded the active career to avoid re-fetching on mode switch
  const [initialized, setInitialized] = useState(false);

  // Fetch available careers
  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const response = await fetch('/api/careers');
        if (response.ok) {
          const data = await response.json();
          setCareers(data.careers || []);
        } else {
          // If endpoint doesn't exist yet, use mock data for UI development
          setCareers([
            {
              id: 'mock-1',
              name: 'Senior Java Backend Developer',
              description: 'Advanced Java, Spring Boot, concurrency, distributed systems',
              topicCount: 15,
            },
            {
              id: 'mock-2',
              name: 'Full Stack Developer',
              description: 'Frontend and backend development with modern frameworks',
              topicCount: 20,
            },
            {
              id: 'mock-3',
              name: 'DevOps Engineer',
              description: 'CI/CD, containers, cloud infrastructure, monitoring',
              topicCount: 12,
            },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch careers:', err);
        // Use mock data on error
        setCareers([
          {
            id: 'mock-1',
            name: 'Senior Java Backend Developer',
            description: 'Advanced Java, Spring Boot, concurrency, distributed systems',
            topicCount: 15,
          },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCareers();
  }, []);

  // Fetch active career - only when in INTERVIEW mode and not yet initialized
  useEffect(() => {
    // Skip fetching if in FREE mode or already initialized
    if (studyMode !== 'INTERVIEW' || initialized) {
      // Clear active career if switching to FREE mode
      if (studyMode === 'FREE' && activeCareer) {
        setActiveCareer(null);
      }
      return;
    }

    const fetchActiveCareer = async () => {
      try {
        const response = await fetch('/api/careers/active');
        if (response.ok) {
          const data = await response.json();
          setActiveCareer(data.userCareer);
        }
      } catch (err) {
        console.error('Failed to fetch active career:', err);
      } finally {
        setInitialized(true);
      }
    };

    fetchActiveCareer();
  }, [studyMode, initialized]);

  const handleSelectCareer = async (careerId: string) => {
    setSwitching(true);
    setError('');

    try {
      const response = await fetch(`/api/careers/${careerId}/select`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setActiveCareer(data.userCareer);
        setIsOpen(false);
        onCareerChange?.(careerId);
      } else {
        const data = await response.json().catch(() => ({ error: { message: 'Failed to select career' } }));
        setError(data.error?.message || 'Failed to select career');
      }
    } catch (err) {
      console.error('Failed to select career:', err);
      setError('Failed to select career. Please try again.');
    } finally {
      setSwitching(false);
    }
  };

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
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="font-medium text-gray-700">
          {activeCareer?.career.name || 'Select Career Track'}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
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
              <h3 className="text-sm font-semibold text-gray-900">Career Track</h3>
              <p className="text-xs text-gray-500 mt-1">Choose your interview preparation path</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border-b border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <div className="p-2">
              {careers.map((career) => (
                <button
                  key={career.id}
                  onClick={() => handleSelectCareer(career.id)}
                  disabled={switching}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    activeCareer?.career.id === career.id
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{career.name}</span>
                        {activeCareer?.career.id === career.id && (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{career.description}</p>
                      {career.topicCount !== undefined && (
                        <p className="text-xs text-gray-500 mt-2">
                          {career.topicCount} topics
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {careers.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No career tracks available
                </div>
              )}

              {/* Upload PDF Button */}
              {showUploadButton && (
                <Link
                  href="/upload"
                  className="block m-2 p-3 rounded-lg border-2 border-dashed border-indigo-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-center"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="flex items-center justify-center gap-2 text-indigo-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="font-medium">Upload PDF to Create Career</span>
                  </div>
                  <p className="text-xs text-indigo-500 mt-1">Create a custom career path from your PDF</p>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
