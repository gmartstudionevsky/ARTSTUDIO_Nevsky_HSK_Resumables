import { PrismaClient, Role } from '@prisma/client';
import { hash } from '@node-rs/argon2';

export type TestData = {
  itemId: string;
  purposeId: string;
};

export async function setupTestData(): Promise<TestData> {
  const prisma = new PrismaClient();

  try {
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

    return { itemId: item.id, purposeId: purpose.id };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupTestData()
    .then((data) => {
      console.log(JSON.stringify(data));
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}


export async function ensureAdminCredentials(login: string, password: string): Promise<void> {
  const prisma = new PrismaClient();

  try {
    const passwordHash = await hash(password);

    await prisma.user.upsert({
      where: { login },
      create: {
        login,
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
  } finally {
    await prisma.$disconnect();
  }
}
