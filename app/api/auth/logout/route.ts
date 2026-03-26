/**
 * POST /api/auth/logout
 *
 * Logout and clear auth token and session data.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  // Clear auth token
  cookieStore.delete('auth_token');
  // Clear session-only LLM credentials
  cookieStore.delete('llm_temp_key');

  return NextResponse.json({ success: true });
}
