import { NextResponse } from 'next/server';

import { GET as canonicalGET, PATCH as canonicalPATCH } from '@/app/api/accounting-positions/[id]/route';

import { COMPAT_HEADERS } from '../compat';

export async function GET(request: Request, context: { params: { id: string } }): Promise<NextResponse> {
  const response = await canonicalGET(request, context);
  const payload = await response.json().catch(() => null) as { accountingPosition?: Record<string, unknown> } | null;
  if (!payload || !response.ok) return new NextResponse(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...COMPAT_HEADERS } });

  const accountingPosition = payload.accountingPosition;
  return NextResponse.json({ item: accountingPosition, accountingPosition }, { status: response.status, headers: COMPAT_HEADERS });
}

export async function PATCH(request: Request, context: { params: { id: string } }): Promise<NextResponse> {
  const response = await canonicalPATCH(request, context);
  const payload = await response.json().catch(() => null) as { accountingPosition?: unknown } | null;
  if (!payload || !response.ok) return new NextResponse(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...COMPAT_HEADERS } });

  return NextResponse.json({ item: payload.accountingPosition, accountingPosition: payload.accountingPosition }, { status: response.status, headers: COMPAT_HEADERS });
}
