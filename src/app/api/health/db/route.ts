import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ db: 'not_configured' });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ db: 'ok' });
  } catch {
    return NextResponse.json({ db: 'error' }, { status: 503 });
  }
}
