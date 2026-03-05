import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL обязателен'),
  SESSION_SECRET: z.string().min(1, 'SESSION_SECRET обязателен'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ENABLE_DEBUG: z.enum(['true', 'false']).default('false')
});

export type RuntimeEnv = z.infer<typeof envSchema>;

type EnvResult =
  | { ok: true; data: RuntimeEnv }
  | { ok: false; error: z.ZodError<RuntimeEnv> };

function readRawEnv(): Record<keyof RuntimeEnv, string | undefined> {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG
  };
}

export function getEnv(): EnvResult {
  const parsed = envSchema.safeParse(readRawEnv());

  if (!parsed.success) {
    return { ok: false, error: parsed.error };
  }

  return { ok: true, data: parsed.data };
}

export function requireEnv(): RuntimeEnv {
  const result = getEnv();

  if (!result.ok) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');

    throw new Error(`Ошибка окружения: обязательные переменные не настроены (${details}).`);
  }

  return result.data;
}

export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function assertRuntimeEnv(): void {
  if (!isProd()) {
    return;
  }

  requireEnv();
}
