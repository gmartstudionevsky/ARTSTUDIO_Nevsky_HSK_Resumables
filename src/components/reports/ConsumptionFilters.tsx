'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUiText } from '@/components/ui-texts/useUiText';
import { Tooltip } from '@/components/ui/Tooltip';
import { ConsumptionGroupBy } from '@/lib/reports/types';

type FiltersValue = {
  from: string;
  to: string;
  q: string;
  groupBy: ConsumptionGroupBy;
};

type ConsumptionFiltersProps = {
  value: FiltersValue;
  canExport: boolean;
  onChange: (value: FiltersValue) => void;
  onPreset: (preset: '7d' | '30d' | 'month') => void;
  onExport: (format: 'csv' | 'xlsx') => void;
};

export function ConsumptionFilters({
  value,
  canExport,
  onChange,
  onPreset,
  onExport,
}: ConsumptionFiltersProps): JSX.Element {
  const reportUnitTooltip = useUiText('tooltip.reportUnit', 'Единица отчётности — в ней показывается склад и отчёты.');

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Tooltip label="Единица отчётности">
          {reportUnitTooltip}
        </Tooltip>
        <Tooltip label="Правило расчёта">
          Расход считается по операциям «Расход» в выбранном периоде.
        </Tooltip>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Input
          type="date"
          label="From"
          value={value.from}
          onChange={(event) => onChange({ ...value, from: event.target.value })}
        />
        <Input
          type="date"
          label="To"
          value={value.to}
          onChange={(event) => onChange({ ...value, to: event.target.value })}
        />
        <Input
          label="Поиск позиции"
          placeholder="Код или название"
          value={value.q}
          onChange={(event) => onChange({ ...value, q: event.target.value })}
        />
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-text">Группировка</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={value.groupBy === 'expenseArticle' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onChange({ ...value, groupBy: 'expenseArticle' })}
            >
              По статьям расходов
            </Button>
            <Button
              type="button"
              variant={value.groupBy === 'purpose' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onChange({ ...value, groupBy: 'purpose' })}
            >
              По назначениям
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => onPreset('7d')}>
          7 дней
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onPreset('30d')}>
          30 дней
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={() => onPreset('month')}>
          Текущий месяц
        </Button>
        {canExport ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => onExport('csv')}>
              Скачать CSV
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onExport('xlsx')}>
              Скачать XLSX
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
