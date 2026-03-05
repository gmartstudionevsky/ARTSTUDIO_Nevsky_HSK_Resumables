import argon2 from 'argon2';
import { PrismaClient, Role, UiTextScope } from '@prisma/client';

const prisma = new PrismaClient();

const defaultUiTexts: Array<{ key: string; ruText: string; scope?: UiTextScope }> = [
  { key: 'nav.stock', ruText: 'Склад' },
  { key: 'nav.operation', ruText: 'Операция' },
  { key: 'nav.inventory', ruText: 'Инвентаризация' },
  { key: 'nav.history', ruText: 'История' },
  { key: 'nav.profile', ruText: 'Профиль' },
  { key: 'nav.catalog', ruText: 'Номенклатура' },
  { key: 'nav.reports', ruText: 'Отчёты' },
  { key: 'nav.admin.dictionaries', ruText: 'Справочники' },
  { key: 'nav.admin.users', ruText: 'Пользователи' },
  { key: 'nav.admin.telegram', ruText: 'Telegram' },
  { key: 'nav.admin.uiTexts', ruText: 'Тексты интерфейса' },
  { key: 'tooltip.reportUnit', ruText: 'Единица отчётности — в ней показывается склад и отчёты.' },
  { key: 'tooltip.purpose', ruText: 'Назначение — для какого направления/участка учитывается расход.' },
  { key: 'tooltip.expenseArticle', ruText: 'Статья расходов — финансовый разрез для отчёта.' },
];

async function main() {
  const login = 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  const passwordHash = await argon2.hash(password);

  await prisma.user.upsert({
    where: { login },
    create: {
      login,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      forcePasswordChange: true,
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      forcePasswordChange: true,
    },
  });

  for (const item of defaultUiTexts) {
    await prisma.uiText.upsert({
      where: { key: item.key },
      create: {
        key: item.key,
        ruText: item.ruText,
        scope: item.scope ?? UiTextScope.BOTH,
      },
      update: {},
    });
  }

  const defaultChatId = process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim();

  if (defaultChatId) {
    await prisma.telegramChannel.upsert({
      where: { chatId: defaultChatId },
      create: {
        name: 'Основной',
        chatId: defaultChatId,
        isActive: true,
      },
      update: {
        name: 'Основной',
        isActive: true,
      },
    });
  }

  console.log(`Seed complete: admin user '${login}' is ready.`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
