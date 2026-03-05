import { ConsumptionReportQuery, ConsumptionReportResponse } from '@/lib/reports/types';

function toSearchParams(query: ConsumptionReportQuery): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });

  return params;
}

async function handle<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(payload?.error ?? 'Ошибка запроса');
  return payload as T;
}

export async function fetchConsumptionReport(
  query: ConsumptionReportQuery,
): Promise<ConsumptionReportResponse> {
  const params = toSearchParams(query);
  const response = await fetch(`/api/reports/consumption?${params.toString()}`, {
    cache: 'no-store',
  });
  return handle<ConsumptionReportResponse>(response);
}

export function buildConsumptionExportUrl(
  query: ConsumptionReportQuery,
  format: 'csv' | 'xlsx',
): string {
  const params = toSearchParams(query);
  params.set('format', format);
  return `/api/reports/consumption/export?${params.toString()}`;
}
