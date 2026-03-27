'use client';

/**
 * AuthenticatedLayout Component
 *
 * Wraps pages with authentication check and SidePanel.
 * - Checks user authentication
 * - Shows loading spinner while checking
 * - Redirects to /login if not authenticated
 * - Checks if user has completed LLM setup
 * - Shows "Setup Required" message if LLM not configured (instead of redirect)
 * - Allows access to /settings page even when not set up
 * - Renders SidePanelLayout with children as content
 */

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, ArrowRight, Settings } from 'lucide-react';
import { SidePanelLayout } from './SidePanel';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const FUN_MESSAGES = [
  "You're too smart for your own good! Go back to Settings and configure your LLM credentials first.",
  "Whoa there, Einstein! Before you conquer the world, we need to set up your AI sidekick.",
  "Hold your horses, genius! Let's get your AI credentials configured first.",
  "Nice enthusiasm! But even superheroes need their gear. Hit up Settings first.",
  "You're eager, I love that! But we need to teach you our secret handshake first... in Settings.",
];

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [setupChecking, setSetupChecking] = useState(true);
  const [hasLLMConfig, setHasLLMConfig] = useState(false);
  // Assume no config until confirmed - prevents UI flash
  const [hasConfirmedConfig, setHasConfirmedConfig] = useState(false);
  const [funMessage] = useState(() =>
    FUN_MESSAGES[Math.floor(Math.random() * FUN_MESSAGES.length)]
  );

  // Check if user has LLM config setup
  useEffect(() => {
    if (!user || authLoading) return;

    const checkLLMConfig = async () => {
      try {
        const response = await fetch('/api/user/llm-config');
        if (response.ok) {
          setHasLLMConfig(true);
          setHasConfirmedConfig(true);
        } else if (response.status === 404) {
          setHasLLMConfig(false);
          setHasConfirmedConfig(true);
        }
      } catch (error) {
        console.error('Failed to check LLM config:', error);
        // On error, block access to be safe
        setHasLLMConfig(false);
        setHasConfirmedConfig(true);
      } finally {
        setSetupChecking(false);
      }
    };

    checkLLMConfig();
  }, [user, authLoading]);

  // Listen for LLM config save event and refresh
  useEffect(() => {
    const handleLLMConfigSaved = async () => {
      const checkLLMConfig = async () => {
        try {
          const response = await fetch('/api/user/llm-config');
          if (response.ok) {
            setHasLLMConfig(true);
            setHasConfirmedConfig(true);
          } else if (response.status === 404) {
            setHasLLMConfig(false);
            setHasConfirmedConfig(true);
          }
        } catch (error) {
          console.error('Failed to refresh LLM config:', error);
          setHasLLMConfig(false);
          setHasConfirmedConfig(true);
        }
      };

      await checkLLMConfig();
    };

    window.addEventListener('llm-config-saved', handleLLMConfigSaved);
    return () => window.removeEventListener('llm-config-saved', handleLLMConfigSaved);
  }, []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Show loading state while checking authentication or setup
  if (authLoading || setupChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render content if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // If user doesn't have LLM config and not on settings page, show setup required message
  // Only check after we've confirmed the config status (prevents flash)
  const needsSetup = hasConfirmedConfig && !hasLLMConfig && pathname !== '/settings';

  return (
    <SidePanelLayout>
      {needsSetup ? (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Setup Required
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              {funMessage}
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
            >
              Go to Settings
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </SidePanelLayout>
  );
}
