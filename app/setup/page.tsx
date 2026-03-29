'use client';

/**
 * Setup Page
 *
 * Initial setup wizard for self-hosted deployment.
 * Collects database and LLM configuration on first run.
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SetupWizard } from '@/components/SetupWizard';

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);
  const [redirectReason, setRedirectReason] = useState<string | null>(null);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const response = await fetch('/api/setup/check');
        const data = await response.json();

        if (data.configured) {
          // Already configured, redirect to login
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('Failed to check config:', err);
      } finally {
        setIsChecking(false);
      }
    };

    // Get redirect reason from URL params
    const reason = searchParams.get('reason');
    if (reason) {
      setRedirectReason(reason);
    }

    checkConfig();
  }, [searchParams]);

  const handleSetupComplete = () => {
    // Use direct navigation to ensure redirect happens
    window.location.href = '/signup';
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking configuration...</p>
        </div>
      </div>
    );
  }

  return <SetupWizard onComplete={handleSetupComplete} redirectReason={redirectReason} />;
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SetupContent />
    </Suspense>
  );
}
