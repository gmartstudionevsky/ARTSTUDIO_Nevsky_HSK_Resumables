import argon2 from 'argon2';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

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
