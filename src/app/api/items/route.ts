import { NextResponse } from 'next/server';

import { GET as canonicalGET, POST as canonicalPOST } from '@/app/api/accounting-positions/route';

import { COMPAT_HEADERS } from './compat';

export async function GET(request: Request): Promise<NextResponse> {
  const response = await canonicalGET(request);
  const payload = await response.json().catch(() => null) as { accountingPositions?: unknown[]; total?: number } | null;
  if (!payload || !response.ok) {
    return new NextResponse(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...COMPAT_HEADERS } });
  }

  return NextResponse.json({
    items: payload.accountingPositions ?? [],
    total: payload.total ?? 0,
  }, { status: response.status, headers: COMPAT_HEADERS });
}

export async function POST(request: Request): Promise<NextResponse> {
  const response = await canonicalPOST(request);
  const payload = await response.json().catch(() => null) as { accountingPosition?: unknown; transactionId?: string } | null;

  if (!payload || !response.ok) {
    return new NextResponse(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...COMPAT_HEADERS } });
  }

  return NextResponse.json({
    item: payload.accountingPosition,
    transactionId: payload.transactionId,
  }, { status: response.status, headers: COMPAT_HEADERS });
}
