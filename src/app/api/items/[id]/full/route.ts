import { NextResponse } from 'next/server';

import { GET as canonicalGET } from '@/app/api/accounting-positions/[id]/full/route';

import { COMPAT_HEADERS } from '../../compat';

export async function GET(request: Request, context: { params: { id: string } }): Promise<NextResponse> {
  const response = await canonicalGET(request, context);
  const payload = await response.json().catch(() => null) as { accountingPosition?: unknown; refs?: Record<string, unknown> } | null;

  if (!payload || !response.ok) return new NextResponse(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...COMPAT_HEADERS } });

  return NextResponse.json({
    item: payload.accountingPosition,
    refs: { ...payload.refs, purposes: payload.refs?.sections ?? [] },
  }, { status: response.status, headers: COMPAT_HEADERS });
}
