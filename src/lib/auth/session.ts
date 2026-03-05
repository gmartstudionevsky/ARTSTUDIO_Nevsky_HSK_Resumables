import { cookies } from 'next/headers';

import { prisma } from '@/lib/db/prisma';
import { hashSessionToken, createSessionToken } from '@/lib/auth/token';

export const SESSION_COOKIE_NAME = 'asc_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSessionExpiryDate(): Date {
  return new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
}

function setSessionCookie(token: string): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

function clearSessionCookie(): void {
  cookies().set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export async function createSession(userId: string): Promise<void> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt: getSessionExpiryDate(),
    },
  });

  setSessionCookie(token);
}

export async function getSessionFromRequestCookies() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  return prisma.session.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      user: {
        isActive: true,
      },
    },
    include: {
      user: true,
    },
  });
}

export async function revokeSession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    clearSessionCookie();
    return;
  }

  const tokenHash = hashSessionToken(token);

  await prisma.session.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  clearSessionCookie();
}
