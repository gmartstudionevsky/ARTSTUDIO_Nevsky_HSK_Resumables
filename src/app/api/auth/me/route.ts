import { NextResponse } from 'next/server';

import { getSessionFromRequestCookies } from '@/lib/auth/session';

export async function GET(): Promise<NextResponse> {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: session.user.id,
      login: session.user.login,
      role: session.user.role,
    },
  });
}
