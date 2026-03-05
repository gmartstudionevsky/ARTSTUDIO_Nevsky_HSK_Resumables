import { httpGet } from '@/lib/http/client';
import { ConsumptionReportQuery, ConsumptionReportResponse } from '@/lib/reports/types';

function toSearchParams(query: ConsumptionReportQuery): URLSearchParams {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === '') return;
    params.set(key, String(value));
  });

  return params;
}

export async function fetchConsumptionReport(
  query: ConsumptionReportQuery,
): Promise<ConsumptionReportResponse> {
  const params = toSearchParams(query);
  return httpGet<ConsumptionReportResponse>(`/api/reports/consumption?${params.toString()}`);
}

export function buildConsumptionExportUrl(
  query: ConsumptionReportQuery,
  format: 'csv' | 'xlsx',
): string {
  const params = toSearchParams(query);
  params.set('format', format);
  return `/api/reports/consumption/export?${params.toString()}`;
}
