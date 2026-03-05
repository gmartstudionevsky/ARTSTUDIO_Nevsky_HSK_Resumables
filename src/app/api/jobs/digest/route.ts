import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sendDigest } from '@/lib/telegram/service';

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  const secret = request.headers.get('x-job-secret');

  if (!secret || !process.env.JOB_SECRET || secret !== process.env.JOB_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const result = await sendDigest(parsed.data.date);
  return NextResponse.json({ ok: true, date: result.date, sent: result.sent, failed: result.failed });
}
