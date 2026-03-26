'use client';

/**
 * Study Page - Redirect to Free Practice
 *
 * This page is kept for backward compatibility.
 * Users accessing /study will be redirected to /free.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudyPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to Free Practice page
    router.replace('/free');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting to Free Practice...</p>
      </div>
    </div>
  );
}
