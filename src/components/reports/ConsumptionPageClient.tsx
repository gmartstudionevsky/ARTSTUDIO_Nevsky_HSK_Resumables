'use client';

import { useEffect, useMemo, useState } from 'react';

import { ConsumptionFilters } from '@/components/reports/ConsumptionFilters';
import { ConsumptionGroups } from '@/components/reports/ConsumptionGroups';
import { EmptyState } from '@/components/ui/EmptyState';
import { buildConsumptionExportUrl, fetchConsumptionReport } from '@/lib/reports/api';
import { ConsumptionGroupBy, ConsumptionReportResponse } from '@/lib/reports/types';

type FilterState = {
  from: string;
  to: string;
  q: string;
  groupBy: ConsumptionGroupBy;
};

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getInitialFilters(): FilterState {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 6);

  return {
    from: formatDateInput(from),
    to: formatDateInput(now),
    q: '',
    groupBy: 'expenseArticle',
  };
}

function dateToApiRange(value: string, edge: 'from' | 'to'): string {
  return edge === 'from' ? `${value}T00:00:00.000Z` : `${value}T23:59:59.999Z`;
}

export function ConsumptionPageClient({ canExport }: { canExport: boolean }): JSX.Element {
  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [data, setData] = useState<ConsumptionReportResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');

    void fetchConsumptionReport({
      from: dateToApiRange(filters.from, 'from'),
      to: dateToApiRange(filters.to, 'to'),
      groupBy: filters.groupBy,
      q: filters.q || undefined,
    })
      .then((payload) => setData(payload))
      .catch((requestError: unknown) => {
        setData(null);
        setError(
          requestError instanceof Error ? requestError.message : 'Не удалось загрузить отчёт',
        );
      });
  }, [filters]);

  const exportQuery = useMemo(
    () => ({
      from: dateToApiRange(filters.from, 'from'),
      to: dateToApiRange(filters.to, 'to'),
      groupBy: filters.groupBy,
      q: filters.q || undefined,
    }),
    [filters],
  );

  function applyPreset(preset: '7d' | '30d' | 'month'): void {
    const now = new Date();

    if (preset === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      setFilters((prev) => ({
        ...prev,
        from: formatDateInput(monthStart),
        to: formatDateInput(now),
      }));
      return;
    }

    const from = new Date(now);
    from.setDate(now.getDate() - (preset === '7d' ? 6 : 29));
    setFilters((prev) => ({ ...prev, from: formatDateInput(from), to: formatDateInput(now) }));
  }

  function handleExport(format: 'csv' | 'xlsx'): void {
    window.open(buildConsumptionExportUrl(exportQuery, format), '_blank', 'noopener,noreferrer');
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Отчёт: расход</h1>
        <p className="text-sm text-muted">
          Показывает расход по позициям с разбивкой по статьям расходов (или назначениям).
        </p>
      </header>

      <ConsumptionFilters
        value={filters}
        canExport={canExport}
        onChange={setFilters}
        onPreset={applyPreset}
        onExport={handleExport}
      />

      {error ? <p className="text-sm text-critical">{error}</p> : null}
      {data?.meta.warnings?.length ? (
        <p className="text-xs text-warn">Есть позиции с fallback коэффициента отчётной единицы.</p>
      ) : null}

      {data && data.groups.length === 0 ? (
        <EmptyState title="Нет данных" description="За выбранный период расход не найден." />
      ) : null}
      {data && data.groups.length > 0 ? <ConsumptionGroups groups={data.groups} /> : null}
    </section>
  );
}
