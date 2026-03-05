'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { ItemUnitsEditor } from '@/components/catalog/ItemUnitsEditor';
import { ItemUnitRow, RefOption } from '@/components/catalog/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';

type ItemPayload = {
  item: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    categoryId: string;
    defaultExpenseArticleId: string;
    defaultPurposeId: string;
    baseUnitId: string;
    defaultInputUnitId: string;
    reportUnitId: string;
    minQtyBase: string | null;
    synonyms: string | null;
    note: string | null;
  };
  refs: {
    categories: RefOption[];
    expenseArticles: RefOption[];
    purposes: RefOption[];
    units: RefOption[];
  };
};

export function ItemDetailsClient(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<ItemPayload | null>(null);
  const [units, setUnits] = useState<ItemUnitRow[]>([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    async function load() {
      const [itemResponse, unitsResponse] = await Promise.all([
        fetch(`/api/items/${params.id}/full`, { cache: 'no-store' }),
        fetch(`/api/items/${params.id}/units`, { cache: 'no-store' }),
      ]);
      if (!itemResponse.ok) return;
      const itemPayload = (await itemResponse.json()) as ItemPayload;
      const unitsPayload = (await unitsResponse.json()) as { units: Array<{ unitId: string; factorToBase: string; isAllowed: boolean; isDefaultInput: boolean; isDefaultReport: boolean }> };
      setData(itemPayload);
      setUnits(unitsPayload.units.map((row) => ({ ...row, factorToBase: Number(row.factorToBase) })));
    }
    void load();
  }, [params.id]);

  if (!data) return <p>Загрузка...</p>;
  const itemData = data;

  async function save() {
    await fetch(`/api/items/${itemData.item.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(itemData.item) });
    const response = await fetch(`/api/items/${itemData.item.id}/units`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ units }) });
    if (response.ok) setToast('Изменения сохранены');
  }

  async function toggle() {
    const response = await fetch(`/api/items/${itemData.item.id}/toggle-active`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !itemData.item.isActive }) });
    if (!response.ok) return;
    setData((prev) => prev ? { ...prev, item: { ...prev.item, isActive: !prev.item.isActive } } : prev);
  }

  return (
    <section className="space-y-4">
      <Link href="/catalog" className="text-sm text-accent underline">← Назад</Link>
      <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold">{itemData.item.code} · {itemData.item.name}</h1><Badge variant={itemData.item.isActive ? 'ok' : 'neutral'}>{itemData.item.isActive ? 'Активна' : 'Архив'}</Badge></div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input label="Название" value={itemData.item.name} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, name: e.target.value } } : prev)} />
        <Select label="Раздел" value={itemData.item.categoryId} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, categoryId: e.target.value } } : prev)}>{itemData.refs.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
        <Select label="Статья расходов" value={itemData.item.defaultExpenseArticleId} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, defaultExpenseArticleId: e.target.value } } : prev)}>{itemData.refs.expenseArticles.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select>
        <Select label="Назначение" value={itemData.item.defaultPurposeId} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, defaultPurposeId: e.target.value } } : prev)}>{itemData.refs.purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select>
        <Input label="Мин. остаток" type="number" value={itemData.item.minQtyBase ?? ''} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, minQtyBase: e.target.value } } : prev)} />
        <Input label="Синонимы" value={itemData.item.synonyms ?? ''} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, synonyms: e.target.value } } : prev)} />
        <Input label="Примечание" value={itemData.item.note ?? ''} onChange={(e) => setData((prev) => prev ? { ...prev, item: { ...prev.item, note: e.target.value } } : prev)} />
      </div>

      <div className="space-y-2 rounded-lg border border-border p-4">
        <h2 className="font-semibold">Единицы</h2>
        <p className="text-sm">Базовая единица: {itemData.refs.units.find((item) => item.id === data.item.baseUnitId)?.name}</p>
        <ItemUnitsEditor units={itemData.refs.units} value={units} baseUnitId={itemData.item.baseUnitId} onChange={setUnits} />
      </div>
      <div className="flex gap-2"><Button onClick={() => void save()}>Сохранить</Button><Button variant="secondary" onClick={() => void toggle()}>{itemData.item.isActive ? 'В архив' : 'Вернуть'}</Button><Button variant="ghost" onClick={() => router.push('/catalog')}>Закрыть</Button></div>
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </section>
  );
}
