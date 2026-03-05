'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ActiveFilter, StockStatusFilter } from '@/lib/stock/types';

type RefOption = { id: string; name: string; code?: string };

interface StockFiltersValue {
  q: string;
  categoryId: string;
  expenseArticleId: string;
  purposeId: string;
  status: StockStatusFilter;
  active: ActiveFilter;
}

interface StockFiltersProps {
  value: StockFiltersValue;
  categories: RefOption[];
  expenseArticles: RefOption[];
  purposes: RefOption[];
  onChange: (value: StockFiltersValue) => void;
}

export function StockFilters({ value, categories, expenseArticles, purposes, onChange }: StockFiltersProps): JSX.Element {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 md:grid-cols-2 xl:grid-cols-3">
      <Input label="Поиск" placeholder="Код, название или синоним" value={value.q} onChange={(event) => onChange({ ...value, q: event.target.value })} />
      <Select label="Раздел" value={value.categoryId} onChange={(event) => onChange({ ...value, categoryId: event.target.value })}>
        <option value="">Все</option>
        {categories.map((item) => (
          <option key={item.id} value={item.id}>{item.name}</option>
        ))}
      </Select>
      <Select label="Статья расходов" value={value.expenseArticleId} onChange={(event) => onChange({ ...value, expenseArticleId: event.target.value })}>
        <option value="">Все</option>
        {expenseArticles.map((item) => (
          <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
        ))}
      </Select>
      <Select label="Назначение" value={value.purposeId} onChange={(event) => onChange({ ...value, purposeId: event.target.value })}>
        <option value="">Все</option>
        {purposes.map((item) => (
          <option key={item.id} value={item.id}>{item.code} — {item.name}</option>
        ))}
      </Select>
      <Select label="Статус" value={value.status} onChange={(event) => onChange({ ...value, status: event.target.value as StockStatusFilter })}>
        <option value="all">Все</option>
        <option value="belowMin">Ниже минимума</option>
        <option value="zero">Нулевые</option>
        <option value="ok">ОК</option>
      </Select>
      <Select label="Активность" value={value.active} onChange={(event) => onChange({ ...value, active: event.target.value as ActiveFilter })}>
        <option value="true">Активные</option>
        <option value="false">Архив</option>
        <option value="all">Все</option>
      </Select>
    </div>
  );
}
