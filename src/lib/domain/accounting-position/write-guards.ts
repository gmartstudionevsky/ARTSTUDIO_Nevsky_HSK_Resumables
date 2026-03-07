import { AccountingAxisMode } from '@/lib/domain/accounting-position/types';

export interface AccountingPositionWriteDraft {
  defaultExpenseArticleId?: string | null;
  defaultPurposeId?: string | null;
}

export interface AccountingPositionWriteGuardOptions {
  availability?: {
    expenseArticle?: AccountingAxisMode;
    section?: AccountingAxisMode;
  };
}

export interface AccountingPositionWriteGuardResult {
  valid: boolean;
  errors: string[];
}

export function validateAccountingPositionWriteDraft(
  draft: AccountingPositionWriteDraft,
  options?: AccountingPositionWriteGuardOptions,
): AccountingPositionWriteGuardResult {
  const expenseArticleMode = options?.availability?.expenseArticle ?? 'required';
  const sectionMode = options?.availability?.section ?? 'required';
  const errors: string[] = [];

  if (expenseArticleMode === 'required' && !draft.defaultExpenseArticleId) {
    errors.push('Для позиции обязателен defaultExpenseArticleId (analytics.expenseArticle required).');
  }

  if (sectionMode === 'required' && !draft.defaultPurposeId) {
    errors.push('Для позиции обязателен defaultPurposeId (analytics.section required).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
