import { hash } from '@node-rs/argon2';
import { PrismaClient, Role } from '@prisma/client';

export async function ensureE2EAdminUser(login: string, password: string): Promise<{ id: string; login: string; role: Role; isActive: boolean }> {
  const prisma = new PrismaClient();

  try {
    const passwordHash = await hash(password);
    const user = await prisma.user.upsert({
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
      select: { id: true, login: true, role: true, isActive: true },
    });

    return user;
  } finally {
    await prisma.$disconnect();
  }
}
