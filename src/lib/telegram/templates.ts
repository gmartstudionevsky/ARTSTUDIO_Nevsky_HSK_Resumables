import { TxType } from '@prisma/client';

type TxLineTemplateData = {
  itemName: string;
  qtyInput: string;
  unitName: string;
  expenseArticleCode: string;
  purposeCode: string;
};

type TxTemplateData = {
  type: TxType;
  occurredAt: Date;
  login: string;
  transactionId: string;
  appUrl: string;
  lines: TxLineTemplateData[];
};

type DigestLine = {
  name: string;
  qtyReport: string;
  unitName: string;
  minQtyBase: string | null;
};

type DigestTemplateData = {
  dateISO: string;
  appUrl: string;
  includeBelowMin: boolean;
  includeZero: boolean;
  belowMin: DigestLine[];
  zero: DigestLine[];
};

function txTypeLabel(type: TxType): string {
  if (type === TxType.IN) return 'Приход';
  if (type === TxType.OUT) return 'Расход';
  return 'Коррекция';
}

export function buildTxCreatedMessage(data: TxTemplateData): string {
  const header = `${txTypeLabel(data.type)} • ${data.occurredAt.toLocaleString('ru-RU')}`;
  const lines = data.lines.slice(0, 10).map((line) => `- ${line.itemName} — ${line.qtyInput} ${line.unitName} (статья: ${line.expenseArticleCode}, назначение: ${line.purposeCode})`);
  const extraCount = data.lines.length > 10 ? data.lines.length - 10 : 0;
  const extraText = extraCount > 0 ? `\n… ещё ${extraCount}` : '';

  return [
    header,
    `Кто: ${data.login}`,
    '',
    'Строки:',
    ...lines,
    extraText,
    '',
    `Операция: ${data.appUrl}/history/${data.transactionId}`,
  ]
    .filter(Boolean)
    .join('\n');
}

function renderDigestBlock(title: string, rows: DigestLine[]): string {
  if (rows.length === 0) {
    return `${title}:\n- Нет позиций`;
  }

  return `${title}:\n${rows
    .slice(0, 20)
    .map((item) => `- ${item.name} — ${item.qtyReport} ${item.unitName} (мин: ${item.minQtyBase ?? '—'})`)
    .join('\n')}`;
}

export function buildDigestMessage(data: DigestTemplateData): string {
  const sections: string[] = [`Дайджест склада • ${data.dateISO}`];

  if (data.includeBelowMin) {
    sections.push(renderDigestBlock('Ниже минимума', data.belowMin));
  }

  if (data.includeZero) {
    sections.push(renderDigestBlock('Нулевые', data.zero));
  }

  sections.push(`Подробнее: ${data.appUrl}/stock?status=belowMin`);
  sections.push(`Нулевые: ${data.appUrl}/stock?status=zero`);

  return sections.join('\n\n');
}
