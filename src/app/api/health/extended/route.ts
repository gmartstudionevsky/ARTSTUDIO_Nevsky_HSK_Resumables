import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';

export async function GET(): Promise<NextResponse> {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ status: 'ok', db: 'not_configured' });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', db: 'ok' });
  } catch {
    return NextResponse.json({ status: 'ok', db: 'error' }, { status: 503 });
  }
}
