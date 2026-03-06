'use client';

import { useEffect, useState } from 'react';

import { CancelModal } from '@/components/operation/CancelModal';
import { LineEditorModal } from '@/components/operation/LineEditorModal';
import { Button } from '@/components/ui/Button';
import { fetchHistoryDetail, fetchItemUnits, fetchLookup } from '@/lib/history/api';
import { HistoryLine, HistoryTransactionDetail, RefOption } from '@/lib/history/types';
import { fetchPolicies } from '@/lib/operation/api';

async function postJson(url: string, payload: unknown): Promise<void> {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Ошибка запроса');
  }
}

export function QuickFixDrawer({ id, open, onClose, onChanged }: { id: string | null; open: boolean; onClose: () => void; onChanged: () => void }): JSX.Element | null {
  const [detail, setDetail] = useState<HistoryTransactionDetail | null>(null);
  const [cancelLine, setCancelLine] = useState<HistoryLine | null>(null);
  const [correctLine, setCorrectLine] = useState<HistoryLine | null>(null);
  const [reasons, setReasons] = useState<RefOption[]>([]);
  const [articles, setArticles] = useState<RefOption[]>([]);
  const [purposes, setPurposes] = useState<RefOption[]>([]);
  const [correctUnits, setCorrectUnits] = useState<Array<{ id: string; unitId: string; unit: { id: string; name: string } }>>([]);
  const [requireReason, setRequireReason] = useState(true);

  useEffect(() => {
    if (!open || !id) return;
    void Promise.all([fetchLookup('reasons'), fetchLookup('expense-articles'), fetchLookup('purposes'), fetchHistoryDetail(id), fetchPolicies()]).then(([reasonRows, articleRows, purposeRows, tx, policies]) => {
      setReasons(reasonRows);
      setArticles(articleRows);
      setPurposes(purposeRows);
      setDetail(tx);
      setRequireReason(policies.requireReasonOnCancel);
    });
  }, [open, id]);

  if (!open || !id) return null;

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-40 w-full max-w-3xl overflow-y-auto border-l border-border bg-bg p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Строки операции</h3>
          <Button variant="secondary" onClick={onClose}>Закрыть</Button>
        </div>
        {!detail ? <p className="text-sm text-muted">Загрузка...</p> : (
          <div className="space-y-2">
            {detail.lines.filter((line) => line.status === 'ACTIVE').map((line) => (
              <div key={line.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{line.item.code} — {line.item.name}</p>
                <p className="text-xs text-muted">{line.qtyInput} {line.unit.name}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setCancelLine(line)}>Отменить строку</Button>
                  <Button size="sm" onClick={() => {
                    setCorrectLine(line);
                    void fetchItemUnits(line.item.id).then((units) => setCorrectUnits(units));
                  }}>Исправить</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <CancelModal
        open={Boolean(cancelLine)}
        reasons={reasons.map((item) => ({ ...item, isActive: true }))}
        requireReason={requireReason}
        onClose={() => setCancelLine(null)}
        onSubmit={(payload) => {
          if (!cancelLine) return;
          void (async () => {
            await postJson(`/api/transaction-lines/${cancelLine.id}/cancel`, payload);
            const tx = await fetchHistoryDetail(id);
            setDetail(tx);
            setCancelLine(null);
            onChanged();
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
        requireReason={requireReason}
        initial={correctLine ? { qtyInput: correctLine.qtyInput, unitId: correctLine.unit.id, expenseArticleId: correctLine.expenseArticle.id, purposeId: correctLine.purpose.id, comment: correctLine.comment ?? '' } : {}}
        onClose={() => setCorrectLine(null)}
        onSubmit={(payload) => {
          if (!correctLine) return;
          void (async () => {
            await postJson(`/api/transaction-lines/${correctLine.id}/correct`, payload);
            const tx = await fetchHistoryDetail(id);
            setDetail(tx);
            setCorrectLine(null);
            onChanged();
          })();
        }}
      />
    </>
  );
}
