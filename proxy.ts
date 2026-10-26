import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import {
  isDemoModeEnabled,
  isSupabaseConfigured,
} from '@/lib/supabase/client';

export function proxy(request: NextRequest) {
  if (isSupabaseConfigured) return updateSession(request);
  if (request.nextUrl.pathname === '/api/health' || isDemoModeEnabled)
    return NextResponse.next();

  return NextResponse.json(
    { status: 'unavailable' },
    {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': '60',
      },
    },
  );
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
