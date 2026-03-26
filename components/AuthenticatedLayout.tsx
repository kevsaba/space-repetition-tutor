'use client';

/**
 * AuthenticatedLayout Component
 *
 * Wraps pages with authentication check and SidePanel.
 * - Checks user authentication
 * - Shows loading spinner while checking
 * - Redirects to /login if not authenticated
 * - Checks if user has completed LLM setup
 * - Redirects to /settings if setup not complete (with fun message)
 * - Allows access to /settings page even when not set up
 * - Renders SidePanelLayout with children as content
 */

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { SidePanelLayout } from './SidePanel';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

const FUN_MESSAGES = [
  "Every hero needs their gear first! Let's set up your AI sidekick.",
  "Before we conquer the world, let's get you powered up!",
  "Time to activate your superpowers! Setup first.",
  "Even wizards need their wands. Let's configure your AI!",
  "Your journey begins with a single step... to Settings!",
];

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [setupChecking, setSetupChecking] = useState(true);
  const [hasLLMConfig, setHasLLMConfig] = useState(false);
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
        } else if (response.status === 404) {
          setHasLLMConfig(false);
        }
      } catch (error) {
        console.error('Failed to check LLM config:', error);
        // On error, allow access (don't block)
        setHasLLMConfig(true);
      } finally {
        setSetupChecking(false);
      }
    };

    checkLLMConfig();
  }, [user, authLoading]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Redirect to settings if setup not complete (but allow settings page itself)
  useEffect(() => {
    if (!authLoading && !setupChecking && user && !hasLLMConfig && pathname !== '/settings') {
      // Store the original destination so we can redirect back after setup
      if (pathname !== '/login') {
        sessionStorage.setItem('postSetupRedirect', pathname);
      }
      router.push(`/settings?message=${encodeURIComponent(funMessage)}`);
    }
  }, [user, authLoading, setupChecking, hasLLMConfig, pathname, router, funMessage]);

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

  // Render with SidePanel layout
  return <SidePanelLayout>{children}</SidePanelLayout>;
}
