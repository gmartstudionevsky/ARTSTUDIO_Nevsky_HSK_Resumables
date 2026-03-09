import { NextResponse } from 'next/server';

import { POST as canonicalPOST } from '@/app/api/accounting-positions/[id]/toggle-active/route';

import { COMPAT_HEADERS } from '../../compat';

export async function POST(request: Request, context: { params: { id: string } }): Promise<NextResponse> {
  const response = await canonicalPOST(request, context);
  const payload = await response.json().catch(() => null) as { accountingPosition?: unknown } | null;

  if (!payload || !response.ok) return new NextResponse(response.body, { status: response.status, headers: { ...Object.fromEntries(response.headers), ...COMPAT_HEADERS } });

  return NextResponse.json({ item: payload.accountingPosition, accountingPosition: payload.accountingPosition }, { status: response.status, headers: COMPAT_HEADERS });
}
