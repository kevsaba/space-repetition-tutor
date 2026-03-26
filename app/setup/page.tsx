'use client';

/**
 * Setup Page
 *
 * Initial setup wizard for self-hosted deployment.
 * Collects database and LLM configuration on first run.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SetupWizard } from '@/components/SetupWizard';

export default function SetupPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

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

    checkConfig();
  }, []);

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

  return <SetupWizard onComplete={handleSetupComplete} />;
}
