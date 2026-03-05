import Link from 'next/link';

import { CatalogItem } from '@/components/catalog/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ItemsTableProps {
  items: CatalogItem[];
  canManage: boolean;
  onToggle: (item: CatalogItem) => Promise<void>;
}

export function ItemsTable({ items, canManage, onToggle }: ItemsTableProps): JSX.Element {
  return (
    <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
      <table className="min-w-full text-sm">
        <thead className="bg-surface text-left text-muted">
          <tr>
            <th className="px-3 py-2">Код / Название</th><th className="px-3 py-2">Раздел</th><th className="px-3 py-2">Статья</th><th className="px-3 py-2">Назначение</th><th className="px-3 py-2">Статус</th><th className="px-3 py-2">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-3 py-2"><p className="font-medium">{item.code}</p><p>{item.name}</p></td>
              <td className="px-3 py-2">{item.category.name}</td>
              <td className="px-3 py-2">{item.defaultExpenseArticle.code} — {item.defaultExpenseArticle.name}</td>
              <td className="px-3 py-2">{item.defaultPurpose.code} — {item.defaultPurpose.name}</td>
              <td className="px-3 py-2"><Badge variant={item.isActive ? 'ok' : 'neutral'}>{item.isActive ? 'Активна' : 'Архив'}</Badge></td>
              <td className="px-3 py-2"><div className="flex gap-2"><Link href={`/catalog/${item.id}`} className="text-accent underline">Открыть</Link>{canManage ? <Button size="sm" variant="secondary" onClick={() => void onToggle(item)}>{item.isActive ? 'В архив' : 'Вернуть'}</Button> : null}</div></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
