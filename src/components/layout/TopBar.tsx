import { APP_NAME } from '@/lib/constants';

export function TopBar(): JSX.Element {
  return (
    <header className="border-b border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-text">{APP_NAME}</p>
        <div className="text-xs text-muted">Действия скоро появятся</div>
      </div>
    </header>
  );
}
