import Link from 'next/link';

import { ItemMovementsList } from '@/components/items/ItemMovementsList';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';
import { prisma } from '@/lib/db/prisma';
import { getStockSnapshotByItemId } from '@/lib/stock/query';

function mapStatus(status: 'OK' | 'BELOW_MIN' | 'ZERO'): { label: string; variant: 'ok' | 'warn' | 'neutral' } {
  if (status === 'BELOW_MIN') return { label: 'Ниже минимума', variant: 'warn' };
  if (status === 'ZERO') return { label: 'Ноль', variant: 'neutral' };
  return { label: 'OK', variant: 'ok' };
}

export default async function ItemReadonlyPage({ params }: { params: { id: string } }): Promise<JSX.Element> {
  await requireSupervisorOrAbove();

  const [item, stock, movements] = await Promise.all([
    prisma.item.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        minQtyBase: true,
        synonyms: true,
        note: true,
        category: { select: { id: true, name: true } },
        defaultExpenseArticle: { select: { id: true, code: true, name: true } },
        defaultPurpose: { select: { id: true, code: true, name: true } },
        baseUnit: { select: { id: true, name: true } },
        defaultInputUnit: { select: { id: true, name: true } },
        reportUnit: { select: { id: true, name: true } },
      },
    }),
    getStockSnapshotByItemId(params.id),
    prisma.transactionLine.findMany({
      where: { itemId: params.id },
      orderBy: [{ transaction: { occurredAt: 'desc' } }, { transaction: { createdAt: 'desc' } }],
      take: 20,
      select: {
        id: true,
        qtyInput: true,
        qtyBase: true,
        status: true,
        transaction: { select: { id: true, batchId: true, type: true, occurredAt: true } },
        unit: { select: { id: true, name: true } },
        expenseArticle: { select: { id: true, code: true, name: true } },
        purpose: { select: { id: true, code: true, name: true } },
      },
    }),
  ]);

  if (!item || !stock) return <p>Позиция не найдена.</p>;

  const badge = mapStatus(stock.status);
  const minQtyReport = item.minQtyBase ? (Number(item.minQtyBase.toString()) / Number(stock.reportFactorToBase)).toString() : null;

  return (
    <section className="space-y-4">
      <Link href="/stock" className="text-sm text-accent underline">← Назад к складу</Link>
      <h1 className="text-2xl font-semibold">Позиция: {item.name}</h1>

      <Card>
        <CardHeader><CardTitle>Остаток</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xl font-semibold">{stock.qtyReport} {item.reportUnit.name}</p>
          <Badge variant={badge.variant}>{badge.label}</Badge>
          {minQtyReport ? <p>Мин. остаток: {minQtyReport} {item.reportUnit.name}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Свойства</CardTitle></CardHeader>
        <CardContent>
          <p>Код: {item.code}</p>
          <p>Раздел: {item.category.name}</p>
          <p>Статья: {item.defaultExpenseArticle.code} — {item.defaultExpenseArticle.name}</p>
          <p>Назначение: {item.defaultPurpose.code} — {item.defaultPurpose.name}</p>
          <p>Активность: {item.isActive ? 'Активна' : 'Архив'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Единицы</CardTitle></CardHeader>
        <CardContent>
          <p>Базовая: {item.baseUnit.name}</p>
          <p>Единица ввода по умолчанию: {item.defaultInputUnit.name}</p>
          <p>Единица отчётности: {item.reportUnit.name}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Последние движения</CardTitle></CardHeader>
        <CardContent>
          <ItemMovementsList
            items={movements.map((line) => ({
              lineId: line.id,
              occurredAt: line.transaction.occurredAt.toISOString(),
              tx: line.transaction,
              qtyInput: line.qtyInput.toString(),
              unit: line.unit,
              qtyBase: line.qtyBase.toString(),
              expenseArticle: line.expenseArticle,
              purpose: line.purpose,
              status: line.status,
            }))}
          />
          <Link href="/history" className="text-sm text-accent underline">Перейти в Историю</Link>
        </CardContent>
      </Card>
    </section>
  );
}
