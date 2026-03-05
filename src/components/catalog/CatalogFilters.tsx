'use client';

import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { RefOption } from '@/components/catalog/types';

interface CatalogFiltersProps {
  q: string;
  categoryId: string;
  expenseArticleId: string;
  purposeId: string;
  active: 'true' | 'false' | 'all';
  categories: RefOption[];
  expenseArticles: RefOption[];
  purposes: RefOption[];
  onChange: (patch: Partial<{ q: string; categoryId: string; expenseArticleId: string; purposeId: string; active: 'true' | 'false' | 'all' }>) => void;
}

export function CatalogFilters(props: CatalogFiltersProps): JSX.Element {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      <Input label="Поиск" value={props.q} onChange={(event) => props.onChange({ q: event.target.value })} placeholder="Код, название или синоним" />
      <Select label="Раздел" value={props.categoryId} onChange={(event) => props.onChange({ categoryId: event.target.value })}>
        <option value="">Все</option>
        {props.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </Select>
      <Select label="Статья расходов" value={props.expenseArticleId} onChange={(event) => props.onChange({ expenseArticleId: event.target.value })}>
        <option value="">Все</option>
        {props.expenseArticles.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
      </Select>
      <Select label="Назначение" value={props.purposeId} onChange={(event) => props.onChange({ purposeId: event.target.value })}>
        <option value="">Все</option>
        {props.purposes.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
      </Select>
      <Select label="Активность" value={props.active} onChange={(event) => props.onChange({ active: event.target.value as 'true' | 'false' | 'all' })}>
        <option value="true">Активные</option>
        <option value="false">Архив</option>
        <option value="all">Все</option>
      </Select>
    </div>
  );
}
