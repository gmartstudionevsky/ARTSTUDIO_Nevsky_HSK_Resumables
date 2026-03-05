import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { getSessionFromRequestCookies } from '@/lib/auth/session';

export async function requireUser() {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    redirect('/login');
  }

  return session.user;
}

export async function requireRole(role: Role) {
  const user = await requireUser();

  if (user.role !== role) {
    redirect('/stock');
  }

  return user;
}

export async function requireManagerOrAdmin() {
  const user = await requireUser();

  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    redirect('/stock');
  }

  return user;
}

export async function requireManagerOrAdminApi(): Promise<NextResponse | null> {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  if (session.user.role !== Role.MANAGER && session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  return null;
}
