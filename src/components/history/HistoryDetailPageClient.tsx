'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { TransactionLinesTable } from '@/components/history/TransactionLinesTable';
import { CancelModal } from '@/components/operation/CancelModal';
import { LineEditorModal } from '@/components/operation/LineEditorModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Toast } from '@/components/ui/Toast';
import { fetchHistoryDetail, fetchItemUnits, fetchLookup } from '@/lib/history/api';
import { HistoryLine, HistoryTransactionDetail, RefOption } from '@/lib/history/types';

function txTypeLabel(type: HistoryTransactionDetail['transaction']['type']): string {
  if (type === 'IN') return 'Приход';
  if (type === 'OUT') return 'Расход';
  if (type === 'ADJUST') return 'Коррекция';
  if (type === 'OPENING') return 'Открытие';
  return 'Инвентаризация';
}

function statusBadge(status: HistoryTransactionDetail['uiStatus']): { label: string; variant: 'ok' | 'warn' | 'neutral' } {
  if (status === 'CANCELLED') return { label: 'Отменено', variant: 'neutral' };
  if (status === 'PARTIAL') return { label: 'Частично', variant: 'warn' };
  return { label: 'Активно', variant: 'ok' };
}

async function postJson(url: string, payload: unknown): Promise<void> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Ошибка запроса');
  }
}

export function HistoryDetailPageClient(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<HistoryTransactionDetail | null>(null);
  const [reasons, setReasons] = useState<RefOption[]>([]);
  const [articles, setArticles] = useState<RefOption[]>([]);
  const [purposes, setPurposes] = useState<RefOption[]>([]);
  const [correctUnits, setCorrectUnits] = useState<Array<{ id: string; unitId: string; unit: { id: string; name: string } }>>([]);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLine, setCancelLine] = useState<HistoryLine | null>(null);
  const [correctLine, setCorrectLine] = useState<HistoryLine | null>(null);
  const [toast, setToast] = useState('');

  const load = useCallback(async (): Promise<void> => {
    const payload = await fetchHistoryDetail(id);
    setDetail(payload);
  }, [id]);

  useEffect(() => {
    void Promise.all([fetchLookup('reasons'), fetchLookup('expense-articles'), fetchLookup('purposes')]).then(([reasonRows, articleRows, purposeRows]) => {
      setReasons(reasonRows);
      setArticles(articleRows);
      setPurposes(purposeRows);
    });
    void load();
  }, [id, load]);

  const badge = useMemo(() => (detail ? statusBadge(detail.uiStatus) : null), [detail]);

  if (!detail) return <p className="text-sm text-muted">Загрузка...</p>;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Операция {detail.transaction.batchId}</h1>
          <p className="text-sm text-muted">{new Date(detail.transaction.occurredAt).toLocaleString('ru-RU')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge>{txTypeLabel(detail.transaction.type)}</Badge>
          {badge ? <Badge variant={badge.variant}>{badge.label}</Badge> : null}
        </div>
      </header>

      <Card>
        <CardHeader><CardTitle>Сводка</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm">Дата операции: <span className="font-medium">{new Date(detail.transaction.occurredAt).toLocaleString('ru-RU')}</span></p>
          <p className="text-sm">Создал: <span className="font-medium">{detail.transaction.createdBy.login}</span></p>
          <p className="text-sm">Статус: <span className="font-medium">{detail.uiStatus}</span></p>
          <p className="text-sm">Примечание: <span className="font-medium">{detail.transaction.note || '—'}</span></p>
          {detail.uiStatus !== 'CANCELLED' ? <Button className="mt-3" variant="danger" onClick={() => { setCancelLine(null); setCancelOpen(true); }}>Отменить операцию</Button> : null}
        </CardContent>
      </Card>

      <p className="text-xs text-muted">Исправление создаёт новую запись, история сохраняется.</p>
      <TransactionLinesTable
        lines={detail.lines}
        onCancel={(line) => { setCancelLine(line); setCancelOpen(true); }}
        onCorrect={(line) => {
          setCorrectLine(line);
          void fetchItemUnits(line.item.id).then((units) => setCorrectUnits(units));
        }}
      />

      <Link href="/history" className="text-sm text-accent underline">← К истории</Link>

      <CancelModal
        open={cancelOpen}
        reasons={reasons.map((item) => ({ ...item, isActive: true }))}
        onClose={() => { setCancelOpen(false); setCancelLine(null); }}
        onSubmit={(payload) => {
          void (async () => {
            await postJson(cancelLine ? `/api/transaction-lines/${cancelLine.id}/cancel` : `/api/transactions/${id}/cancel`, payload);
            setCancelOpen(false);
            setCancelLine(null);
            await load();
            setToast('Данные обновлены');
          })();
        }}
      />

      <LineEditorModal
        open={Boolean(correctLine)}
        mode="correct"
        units={correctUnits.map((unit) => ({ ...unit, itemId: correctLine?.item.id ?? '', factorToBase: '1', isAllowed: true, isDefaultInput: false, isDefaultReport: false, unit: { ...unit.unit, isActive: true } }))}
        articles={articles.map((item) => ({ ...item, isActive: true }))}
        purposes={purposes.map((item) => ({ ...item, isActive: true }))}
        reasons={reasons.map((item) => ({ ...item, isActive: true }))}
        initial={correctLine ? { qtyInput: correctLine.qtyInput, unitId: correctLine.unit.id, expenseArticleId: correctLine.expenseArticle.id, purposeId: correctLine.purpose.id, comment: correctLine.comment ?? '' } : {}}
        onClose={() => setCorrectLine(null)}
        onSubmit={(payload) => {
          if (!correctLine) return;
          void (async () => {
            await postJson(`/api/transaction-lines/${correctLine.id}/correct`, payload);
            setCorrectLine(null);
            await load();
            setToast('Строка исправлена');
          })();
        }}
      />

      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </section>
  );
}
