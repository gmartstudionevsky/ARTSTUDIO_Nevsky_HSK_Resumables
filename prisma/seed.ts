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
