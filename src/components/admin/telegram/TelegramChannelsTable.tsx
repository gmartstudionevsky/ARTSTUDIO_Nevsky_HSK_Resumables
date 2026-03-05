import { Button } from '@/components/ui/Button';

export type TelegramChannelItem = {
  id: string;
  name: string;
  chatId: string;
  isActive: boolean;
};

type Props = {
  items: TelegramChannelItem[];
  onEdit: (item: TelegramChannelItem) => void;
  onToggle: (item: TelegramChannelItem) => void;
  onTest: (item: TelegramChannelItem) => void;
};

export function TelegramChannelsTable({ items, onEdit, onToggle, onTest }: Props): JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-bg text-left text-xs uppercase text-muted">
          <tr>
            <th className="px-3 py-2">Название</th>
            <th className="px-3 py-2">Chat ID</th>
            <th className="px-3 py-2">Статус</th>
            <th className="px-3 py-2 text-right">Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-3 py-2">{item.name}</td>
              <td className="px-3 py-2">{item.chatId}</td>
              <td className="px-3 py-2">{item.isActive ? 'Активен' : 'Архив'}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="secondary" onClick={() => onEdit(item)}>Изменить</Button>
                  <Button size="sm" variant="secondary" onClick={() => onToggle(item)}>{item.isActive ? 'В архив' : 'Вернуть'}</Button>
                  <Button size="sm" onClick={() => onTest(item)}>Тест</Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
