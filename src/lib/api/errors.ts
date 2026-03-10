import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export function isPrismaClientKnownError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function sanitizeApiErrorMessage(error: unknown, fallback = 'Ошибка сервера'): string {
  if (error instanceof ZodError) return 'Некорректные данные запроса';

  if (isPrismaClientKnownError(error)) {
    if (error.code === 'P2002') return 'Конфликт уникальности данных.';
    if (error.code === 'P2003') return 'Нарушена ссылка на связанный объект.';
    if (error.code === 'P2025') return 'Запись не найдена.';
    if (error.code === 'P2034') return 'Конфликт транзакции. Повторите попытку.';
    return fallback;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (
      message.includes('prisma') ||
      message.includes('transaction') ||
      message.includes('database') ||
      message.includes('connection') ||
      message.includes('query')
    ) {
      return fallback;
    }
  }

  return fallback;
}

export function safeServerErrorResponse(error: unknown, fallback = 'Ошибка сервера', status = 500): NextResponse {
  return NextResponse.json({ error: sanitizeApiErrorMessage(error, fallback) }, { status });
}
