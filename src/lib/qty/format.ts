export function formatQty(value: string | number, decimals: number): string {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return '0';
  return number.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
