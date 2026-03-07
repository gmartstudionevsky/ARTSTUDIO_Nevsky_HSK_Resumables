import { NextResponse } from 'next/server';

import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { getAdminControlProjection } from '@/lib/read-models';

export async function GET(): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  const payload = await getAdminControlProjection();
  return NextResponse.json(payload);
}
