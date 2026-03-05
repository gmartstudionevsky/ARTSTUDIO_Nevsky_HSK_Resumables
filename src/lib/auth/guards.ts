import { Role } from '@prisma/client';
import { redirect } from 'next/navigation';

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
