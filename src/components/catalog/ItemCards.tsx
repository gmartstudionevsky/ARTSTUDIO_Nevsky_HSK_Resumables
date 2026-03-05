import Link from 'next/link';

import { CatalogItem } from '@/components/catalog/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

export function ItemCards({ items, canManage, onToggle }: { items: CatalogItem[]; canManage: boolean; onToggle: (item: CatalogItem) => Promise<void> }): JSX.Element {
  return (
    <div className="space-y-3 md:hidden">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="font-semibold">{item.code} · {item.name}</p>
            <p>{item.category.name}</p>
            <p>{item.defaultExpenseArticle.code} — {item.defaultExpenseArticle.name}</p>
            <p>{item.defaultPurpose.code} — {item.defaultPurpose.name}</p>
            <Badge variant={item.isActive ? 'ok' : 'neutral'}>{item.isActive ? 'Активна' : 'Архив'}</Badge>
            <div className="flex gap-2">
              <Link href={`/catalog/${item.id}`} className="text-accent underline">Открыть</Link>
              {canManage ? <Button size="sm" variant="secondary" onClick={() => void onToggle(item)}>{item.isActive ? 'В архив' : 'Вернуть'}</Button> : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
