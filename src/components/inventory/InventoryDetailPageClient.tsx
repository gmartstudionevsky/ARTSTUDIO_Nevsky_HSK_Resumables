'use client';

import { formatRuDate } from '@/lib/datetime/ru';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { ApplyInventoryModal } from '@/components/inventory/ApplyInventoryModal';
import { InventoryFillModal } from '@/components/inventory/InventoryFillModal';
import { InventoryLinesCards } from '@/components/inventory/InventoryLinesCards';
import { InventoryLinesTable } from '@/components/inventory/InventoryLinesTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toast } from '@/components/ui/Toast';
import { applyInventory, fetchInventoryDetail, fillInventoryLines, patchInventoryLines } from '@/lib/inventory/api';
import { InventoryDetailResponse } from '@/lib/inventory/types';

export function InventoryDetailPageClient({ role }: { role: Role }): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<InventoryDetailResponse | null>(null);
  const [fillOpen, setFillOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);

  const load = useCallback(async (): Promise<void> => {
    const payload = await fetchInventoryDetail(id);
    setDetail(payload);
  }, [id]);

  useEffect(() => {
    void load();
    void fetch('/api/lookup/categories?active=true', { cache: 'no-store' }).then(async (res) => {
      const json = (await res.json()) as { items: Array<{ id: string; name: string }> };
      setCategories(json.items);
    });
  }, [load]);


  function onPatch(lineId: string, patch: { qtyFactInput?: string | null; unitId?: string; apply?: boolean; comment?: string | null }): void {
    void (async () => {
      await patchInventoryLines(id, [{ lineId, ...patch }]);
      await load();
    })();
  }
  const unitsByItem = useMemo(() => Object.fromEntries(detail?.lines.map((line) => [line.item.id, [{ unitId: line.unit.id, unit: line.unit }]]) ?? []), [detail?.lines]);
  const canApply = role === Role.ADMIN || role === Role.MANAGER;
  const hasAppliable = (detail?.lines ?? []).some((line) => line.apply && line.qtyFactBase !== null);

  if (!detail) return <p className="text-sm text-muted">Загрузка...</p>;

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Инвентаризация от {formatRuDate(detail.session.occurredAt)}</h1>
          <p className="text-sm text-muted">Факт — реально пересчитанный остаток. Отклонение — факт минус система.</p>
        </div>
        <Badge variant={detail.session.status === 'APPLIED' ? 'ok' : 'warn'}>{detail.session.status === 'APPLIED' ? 'Применена' : 'Черновик'}</Badge>
      </header>
      <div className="rounded-lg border border-border p-3 text-sm">
        <p>Режим: <span className="font-medium">{detail.session.mode === 'OPENING' ? 'Открытие склада 01.03.2026' : 'Обычная'}</span></p>
        <p>Создал: <span className="font-medium">{detail.session.createdBy.login}</span></p>
        <p>Комментарий: <span className="font-medium">{detail.session.note || '—'}</span></p>
      </div>

      {detail.session.status === 'DRAFT' && detail.lines.length === 0 ? <Button onClick={() => setFillOpen(true)}>Сформировать список позиций</Button> : null}

      <InventoryLinesTable
        lines={detail.lines}
        unitsByItem={unitsByItem}
        onChange={onPatch}
      />
      <InventoryLinesCards
        lines={detail.lines}
        unitsByItem={unitsByItem}
        onChange={onPatch}
      />

      {detail.session.status === 'DRAFT' && canApply ? <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => {
        detail.lines.forEach((line) => { if (line.qtyFactBase !== null) onPatch(line.id, { apply: true }); });
      }}>Отметить все</Button><Button variant="secondary" onClick={() => {
        detail.lines.forEach((line) => onPatch(line.id, { apply: false }));
      }}>Снять все</Button><Button disabled={!hasAppliable} onClick={() => setApplyOpen(true)}>Применить выбранное</Button></div> : null}
      <Link href="/inventory" className="text-sm text-accent underline">← К списку</Link>

      <InventoryFillModal
        open={fillOpen}
        categories={categories}
        onClose={() => setFillOpen(false)}
        onSubmit={(payload) => {
          void (async () => {
            await fillInventoryLines(id, payload);
            setFillOpen(false);
            await load();
          })();
        }}
      />
      <ApplyInventoryModal
        open={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSubmit={(payload) => {
          void (async () => {
            await applyInventory(id, payload);
            setApplyOpen(false);
            await load();
            setToast('Инвентаризация применена');
          })();
        }}
      />
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </section>
  );
}
