import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

import { createImportSyncUseCase } from '@/lib/application/import';
import { getSessionFromRequestCookies } from '@/lib/auth/session';

const importSyncUseCase = createImportSyncUseCase();

async function requireAdmin(): Promise<{ id: string } | NextResponse> {
  const session = await getSessionFromRequestCookies();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  if (session.user.role !== Role.ADMIN) return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
  return { id: session.user.id };
}

export async function POST(request: Request): Promise<NextResponse> {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const preview = await importSyncUseCase.previewFromWorkbook({
    userId: admin.id,
    filename: file.name || 'import.xlsx',
    buffer: arrayBuffer,
  });

  return NextResponse.json(preview);
}
