import { NextResponse } from 'next/server';

import { revokeSession } from '@/lib/auth/session';

export async function POST(): Promise<NextResponse> {
  await revokeSession();

  return NextResponse.json({ ok: true });
}
