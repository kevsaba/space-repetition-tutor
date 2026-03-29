/**
 * Setup Required Banner
 *
 * Displayed when a user tries to access features that require
 * the application to be configured, but setup has not been completed.
 */

'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface SetupRequiredBannerProps {
  /**
   * Optional custom message to display
   */
  message?: string;

  /**
   * Optional callback when banner is dismissed
   */
  onDismiss?: () => void;
}

/**
 * Shows a banner indicating that setup must be completed before
 * the user can proceed with the current action.
 */
export function SetupRequiredBanner({ message, onDismiss }: SetupRequiredBannerProps) {
  const defaultMessage = 'Please complete the setup process before continuing.';

  return (
    <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r-lg">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400" aria-hidden="true" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-amber-800">
            Setup Required
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <p>{message || defaultMessage}</p>
          </div>
          <div className="mt-3">
            <Link
              href="/setup"
              className="inline-flex items-center text-sm font-medium text-amber-800 hover:text-amber-700 underline decoration-amber-400 hover:decoration-amber-600 underline-offset-2"
            >
              Go to Setup
              <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex rounded-md p-1.5 text-amber-500 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:ring-offset-2 focus:ring-offset-amber-50"
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
