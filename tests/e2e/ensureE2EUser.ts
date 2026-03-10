import { hash } from '@node-rs/argon2';
import { PrismaClient, Role } from '@prisma/client';

export async function ensureE2EAdminUser(login: string, password: string): Promise<void> {
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

