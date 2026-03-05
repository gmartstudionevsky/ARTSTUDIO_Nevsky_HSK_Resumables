import { NextResponse } from 'next/server';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getSettings } from '@/lib/settings/service';

export async function GET(): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  const policies = await getSettings(prisma);
  return NextResponse.json({ policies });
}
