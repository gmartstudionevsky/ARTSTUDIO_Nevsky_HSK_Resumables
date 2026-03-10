import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';

import { safeServerErrorResponse } from '@/lib/api/errors';
import { requireSupervisorOrAboveApi } from '@/lib/auth/guards';
import { getConsumptionReportProjection } from '@/lib/read-models';

const querySchema = z.object({
  from: z.string().datetime({ offset: true }).or(z.string().date()),
  to: z.string().datetime({ offset: true }).or(z.string().date()),
  groupBy: z.enum(['expenseArticle', 'purpose']).optional().default('expenseArticle'),
  q: z.string().trim().optional(),
  limitGroups: z.coerce.number().int().min(1).max(500).optional().default(200),
});

export async function GET(request: Request): Promise<NextResponse> {
  const { error } = await requireSupervisorOrAboveApi();
  if (error) return error;

  try {
    const query = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams.entries()));
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Некорректные параметры периода' }, { status: 400 });
    }

    const projection = await getConsumptionReportProjection(query);
    return NextResponse.json(projection);
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json({ error: 'Некорректные параметры запроса' }, { status: 400 });
    return safeServerErrorResponse(error, 'Ошибка формирования отчёта');
  }
}
