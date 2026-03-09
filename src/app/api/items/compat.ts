import { NextResponse } from 'next/server';

export const COMPAT_HEADERS = {
  Deprecation: 'true',
  Sunset: 'Tue, 30 Jun 2026 00:00:00 GMT',
  Link: '</api/accounting-positions>; rel="successor-version"',
  'X-ARTSTUDIO-Compat-Route': 'secondary-items-alias',
} as const;

export function withCompatHeaders(response: Response): NextResponse {
  const headers = new Headers(response.headers);
  Object.entries(COMPAT_HEADERS).forEach(([key, value]) => headers.set(key, value));
  return new NextResponse(response.body, { status: response.status, headers });
}
