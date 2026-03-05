import { PrismaClient, SettingKey } from '@prisma/client';

import { DEFAULT_POLICIES } from '@/lib/settings/defaults';
import { DataPolicies, POLICY_KEY_MAP } from '@/lib/settings/types';

function parseValue(key: SettingKey, value: unknown): number | boolean {
  if (key === 'SUPERVISOR_BACKDATE_DAYS') {
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 30) throw new Error('SUPERVISOR_BACKDATE_DAYS должен быть целым числом от 0 до 30');
    return Number(value);
  }
  if (key === 'DISPLAY_DECIMALS') {
    if (!Number.isInteger(value) || Number(value) < 0 || Number(value) > 6) throw new Error('DISPLAY_DECIMALS должен быть целым числом от 0 до 6');
    return Number(value);
  }
  if (typeof value !== 'boolean') throw new Error(`Настройка ${key} должна быть true/false`);
  return value;
}

export async function getSettings(prisma: PrismaClient): Promise<DataPolicies> {
  const rows = await prisma.appSetting.findMany();
  const merged: DataPolicies = { ...DEFAULT_POLICIES };

  for (const row of rows) {
    const field = POLICY_KEY_MAP[row.key];
    try {
      const parsed = parseValue(row.key, row.valueJson);
      (merged[field] as number | boolean) = parsed;
    } catch {
      continue;
    }
  }

  return merged;
}

export async function updateSetting(prisma: PrismaClient, key: SettingKey, value: unknown, actorId: string): Promise<void> {
  const parsed = parseValue(key, value);
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, valueJson: parsed, updatedById: actorId },
    update: { valueJson: parsed, updatedById: actorId },
  });
}
