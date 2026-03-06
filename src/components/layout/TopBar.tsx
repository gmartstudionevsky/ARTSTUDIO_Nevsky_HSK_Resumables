import { APP_NAME } from '@/lib/constants';

export function TopBar(): JSX.Element {
  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-surface/90 px-4 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-surface/80">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">ARTSTUDIO</p>
          <p className="text-sm font-semibold tracking-tight text-text">{APP_NAME}</p>
        </div>
      </div>
    </header>
  );
}
