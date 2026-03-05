import { Role, SettingKey } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuthenticatedApiUser } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getSettings, updateSetting } from '@/lib/settings/service';

const patchSchema = z.object({
  updates: z.array(z.object({ key: z.nativeEnum(SettingKey), value: z.unknown() })).min(1),
});

export async function GET(): Promise<NextResponse> {
  const { user, error } = await requireAuthenticatedApiUser();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  const policies = await getSettings(prisma);
  const rows = await prisma.appSetting.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json({ policies, settings: rows });
}

export async function PATCH(request: Request): Promise<NextResponse> {
  const { user, error } = await requireAuthenticatedApiUser();
  if (error || !user) return error ?? NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });

  try {
    const body = await request.json();
    const data = patchSchema.parse(body);

    for (const update of data.updates) {
      await updateSetting(prisma, update.key, update.value, user.id);
    }

    const policies = await getSettings(prisma);
    return NextResponse.json({ policies });
  } catch (errorPatch) {
    return NextResponse.json({ error: errorPatch instanceof Error ? errorPatch.message : 'Некорректные данные' }, { status: 400 });
  }
}
