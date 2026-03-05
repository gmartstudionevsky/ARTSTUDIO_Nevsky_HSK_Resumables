import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { getSessionFromRequestCookies } from '@/lib/auth/session';

export async function requireAuthenticatedUser() {
  const session = await getSessionFromRequestCookies();

  if (!session) {
    redirect('/login');
  }

  return session.user;
}

export const requireUser = requireAuthenticatedUser;

export async function requireRole(role: Role) {
  const user = await requireAuthenticatedUser();

  if (user.role !== role) {
    redirect('/stock');
  }

  return user;
}

export async function requireManagerOrAdmin() {
  const user = await requireAuthenticatedUser();

  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    redirect('/stock');
  }

  return user;
}

export async function requireSupervisorOrAbove() {
  const user = await requireAuthenticatedUser();

  if (![Role.SUPERVISOR, Role.MANAGER, Role.ADMIN].includes(user.role)) {
    redirect('/stock');
  }

  return user;
}

export async function requireAuthenticatedApiUser() {
  const session = await getSessionFromRequestCookies();
  if (!session) {
    return { error: NextResponse.json({ error: 'Не авторизован' }, { status: 401 }), user: null };
  }
  return { error: null, user: session.user };
}

export async function requireManagerOrAdminApi(): Promise<NextResponse | null> {
  const { error, user } = await requireAuthenticatedApiUser();
  if (error) return error;

  if (user.role !== Role.MANAGER && user.role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  }

  return null;
}

export async function requireSupervisorOrAboveApi(): Promise<{ user: { id: string; role: Role } | null; error: NextResponse | null }> {
  const { error, user } = await requireAuthenticatedApiUser();
  if (error || !user) return { user: null, error: error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 }) };

  if (![Role.SUPERVISOR, Role.MANAGER, Role.ADMIN].includes(user.role)) {
    return { user: null, error: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 }) };
  }

  return { user: { id: user.id, role: user.role }, error: null };
}
