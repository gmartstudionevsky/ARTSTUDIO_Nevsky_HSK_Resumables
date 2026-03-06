import { hash } from '@node-rs/argon2';
import { PrismaClient, Role, SettingKey, UiTextScope } from '@prisma/client';

const prisma = new PrismaClient();

const E2E_USER_LOGIN = process.env.E2E_USER_LOGIN ?? 'e2e_admin';
const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'E2EPass12345!';

type SeedMode = 'defaults' | 'staging' | 'test-e2e' | 'bootstrap-admin';

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
  { key: 'nav.admin.settings', ruText: 'Политики данных' },
  { key: 'nav.admin.periodLocks', ruText: 'Закрытие периода' },
  { key: 'tooltip.reportUnit', ruText: 'Единица отчётности — в ней показывается склад и отчёты.' },
  { key: 'tooltip.purpose', ruText: 'Назначение — для какого направления/участка учитывается расход.' },
  { key: 'tooltip.expenseArticle', ruText: 'Статья расходов — финансовый разрез для отчёта.' },
];

const defaultSettings: Array<{ key: SettingKey; value: number | boolean }> = [
  { key: SettingKey.SUPERVISOR_BACKDATE_DAYS, value: 3 },
  { key: SettingKey.REQUIRE_REASON_ON_CANCEL, value: true },
  { key: SettingKey.ALLOW_NEGATIVE_STOCK, value: true },
  { key: SettingKey.DISPLAY_DECIMALS, value: 2 },
  { key: SettingKey.ENABLE_PERIOD_LOCKS, value: false },
];

async function seedReferenceData(): Promise<void> {
  const category = await prisma.category.upsert({
    where: { name: 'Химия' },
    create: { name: 'Химия', isActive: true },
    update: { isActive: true },
  });

  const unit = await prisma.unit.upsert({
    where: { name: 'шт' },
    create: { name: 'шт', isActive: true },
    update: { isActive: true },
  });

  const expenseArticle = await prisma.expenseArticle.upsert({
    where: { code: '2.1.4' },
    create: { code: '2.1.4', name: '2.1.4', isActive: true },
    update: { name: '2.1.4', isActive: true },
  });

  const purpose = await prisma.purpose.upsert({
    where: { code: '2.1.4' },
    create: { code: '2.1.4', name: '2.1.4', isActive: true },
    update: { name: '2.1.4', isActive: true },
  });

  await prisma.reason.upsert({
    where: { code: 'TEST' },
    create: { code: 'TEST', name: 'Тест', isActive: true },
    update: { name: 'Тест', isActive: true },
  });

  const item = await prisma.item.upsert({
    where: { code: 'ITM-TEST' },
    create: {
      code: 'ITM-TEST',
      name: 'Тестовая позиция',
      categoryId: category.id,
      defaultExpenseArticleId: expenseArticle.id,
      defaultPurposeId: purpose.id,
      baseUnitId: unit.id,
      defaultInputUnitId: unit.id,
      reportUnitId: unit.id,
      isActive: true,
    },
    update: {
      name: 'Тестовая позиция',
      categoryId: category.id,
      defaultExpenseArticleId: expenseArticle.id,
      defaultPurposeId: purpose.id,
      baseUnitId: unit.id,
      defaultInputUnitId: unit.id,
      reportUnitId: unit.id,
      isActive: true,
    },
  });

  await prisma.itemUnit.upsert({
    where: { itemId_unitId: { itemId: item.id, unitId: unit.id } },
    create: {
      itemId: item.id,
      unitId: unit.id,
      factorToBase: 1,
      isAllowed: true,
      isDefaultInput: true,
      isDefaultReport: true,
    },
    update: {
      factorToBase: 1,
      isAllowed: true,
      isDefaultInput: true,
      isDefaultReport: true,
    },
  });
}

export async function seedDefaults(): Promise<void> {
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

  for (const setting of defaultSettings) {
    await prisma.appSetting.upsert({
      where: { key: setting.key },
      create: { key: setting.key, valueJson: setting.value },
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

  console.log('Seed defaults complete: ui_texts and settings are ready.');
}

export async function seedBootstrapAdmin(): Promise<void> {
  const login = process.env.SEED_ADMIN_LOGIN ?? 'admin';
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    throw new Error('SEED_ADMIN_PASSWORD is required for bootstrap-admin mode. Refusing insecure fallback.');
  }

  const existingAdmin = await prisma.user.findUnique({ where: { login } });

  if (existingAdmin) {
    console.log(`Bootstrap admin skipped: user '${login}' already exists.`);
    return;
  }

  const passwordHash = await hash(password);

  await prisma.user.create({
    data: {
      login,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      forcePasswordChange: true,
    },
  });

  console.log(`Bootstrap admin complete: user '${login}' created.`);
}

export async function seedStaging(): Promise<void> {
  await seedDefaults();
  await seedReferenceData();
  console.log('Seed staging complete: no test credentials created.');
}

export async function seedTestE2E(): Promise<void> {
  await seedDefaults();
  await seedReferenceData();

  const passwordHash = await hash(E2E_USER_PASSWORD);
  await prisma.user.upsert({
    where: { login: E2E_USER_LOGIN },
    create: {
      login: E2E_USER_LOGIN,
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      forcePasswordChange: false,
    },
    update: {
      passwordHash,
      role: Role.ADMIN,
      isActive: true,
      forcePasswordChange: false,
    },
  });

  console.log(`Seed test-e2e complete for '${E2E_USER_LOGIN}'.`);
}

async function main(): Promise<void> {
  const mode = (process.argv[2] as SeedMode | undefined) ?? 'defaults';

  if (mode === 'defaults') {
    await seedDefaults();
    return;
  }

  if (mode === 'staging') {
    await seedStaging();
    return;
  }

  if (mode === 'test-e2e') {
    await seedTestE2E();
    return;
  }

  if (mode === 'bootstrap-admin') {
    await seedBootstrapAdmin();
    return;
  }

  throw new Error(`Unknown seed mode: ${mode}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
