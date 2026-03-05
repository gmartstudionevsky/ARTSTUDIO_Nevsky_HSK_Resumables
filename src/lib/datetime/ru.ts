export function formatRuDateTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatRuDate(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function parseRuDateTime(input: string): Date | null {
  const value = input.trim();
  if (!value) return null;

  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const yearRaw = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + yearRaw : yearRaw;
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;

  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}
