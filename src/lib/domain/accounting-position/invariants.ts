import { AccountingAxisMode, AccountingPosition, AccountingPositionAnalytics } from '@/lib/domain/accounting-position/types';

export type AccountingPositionInvariantSeverity = 'blocking' | 'warning' | 'informational';

export type AccountingPositionInvariantCode =
  | 'AXIS_REQUIRED_MISSING'
  | 'AXIS_DISABLED_HAS_VALUE'
  | 'CONTROLLED_PARAMETERS_MODE_CONFLICT'
  | 'CONTROLLED_PARAMETERS_REQUIRED_MISSING'
  | 'CONTROLLED_PARAMETERS_DISABLED_HAS_VALUES'
  | 'CONTROLLED_PARAMETERS_OPTIONAL_EMPTY';

export interface AccountingPositionInvariantIssue {
  code: AccountingPositionInvariantCode;
  axis: 'expenseArticle' | 'section' | 'controlledParameters';
  severity: AccountingPositionInvariantSeverity;
  message: string;
}

export interface AccountingPositionInvariantResult {
  valid: boolean;
  issues: AccountingPositionInvariantIssue[];
  projectionEligibility: {
    expandedMetrics: boolean;
    reasons: string[];
  };
}

export class AccountingPositionInvariantError extends Error {
  readonly issues: AccountingPositionInvariantIssue[];

  constructor(issues: AccountingPositionInvariantIssue[]) {
    super(`Accounting position invariant violation: ${issues.map((issue) => issue.code).join(', ')}`);
    this.name = 'AccountingPositionInvariantError';
    this.issues = issues;
  }
}

function hasAxisValue(value: { id: string; name: string } | null): boolean {
  if (!value) return false;
  return value.id.trim().length > 0 && value.name.trim().length > 0;
}

function validateAxis(
  axis: 'expenseArticle' | 'section',
  mode: AccountingAxisMode,
  value: { id: string; name: string } | null,
): AccountingPositionInvariantIssue[] {
  const issues: AccountingPositionInvariantIssue[] = [];
  const present = hasAxisValue(value);

  if (mode === 'required' && !present) {
    issues.push({
      code: 'AXIS_REQUIRED_MISSING',
      axis,
      severity: 'blocking',
      message: `Аналитическая ось ${axis} обязательна, но отсутствует.`,
    });
  }

  if (mode === 'disabled' && present) {
    issues.push({
      code: 'AXIS_DISABLED_HAS_VALUE',
      axis,
      severity: 'informational',
      message: `Ось ${axis} отключена, поэтому не участвует в расширенных метриках.`,
    });
  }

  return issues;
}

function validateControlledParameters(analytics: AccountingPositionAnalytics): AccountingPositionInvariantIssue[] {
  const issues: AccountingPositionInvariantIssue[] = [];
  const mode = analytics.controlledParameters.mode;
  const availabilityMode = analytics.availability.controlledParameters;
  const hasValues = analytics.controlledParameters.values.length > 0;

  if (mode !== availabilityMode) {
    issues.push({
      code: 'CONTROLLED_PARAMETERS_MODE_CONFLICT',
      axis: 'controlledParameters',
      severity: 'blocking',
      message: 'controlledParameters.mode конфликтует с analytics.availability.controlledParameters.',
    });
  }

  if (mode === 'required' && !hasValues) {
    issues.push({
      code: 'CONTROLLED_PARAMETERS_REQUIRED_MISSING',
      axis: 'controlledParameters',
      severity: 'blocking',
      message: 'Слой controlledParameters обязателен, но значения не заданы.',
    });
  }

  if (mode === 'optional' && !hasValues) {
    issues.push({
      code: 'CONTROLLED_PARAMETERS_OPTIONAL_EMPTY',
      axis: 'controlledParameters',
      severity: 'informational',
      message: 'Слой controlledParameters опционален и сейчас не участвует в расширенных метриках.',
    });
  }

  if (mode === 'disabled' && hasValues) {
    issues.push({
      code: 'CONTROLLED_PARAMETERS_DISABLED_HAS_VALUES',
      axis: 'controlledParameters',
      severity: 'blocking',
      message: 'Слой controlledParameters отключён, но содержит значения.',
    });
  }

  return issues;
}

export function evaluateAccountingPositionInvariants(position: AccountingPosition): AccountingPositionInvariantResult {
  const issues: AccountingPositionInvariantIssue[] = [
    ...validateAxis('expenseArticle', position.analytics.availability.expenseArticle, position.analytics.expenseArticle),
    ...validateAxis('section', position.analytics.availability.section, position.analytics.section),
    ...validateControlledParameters(position.analytics),
  ];

  const blockingIssues = issues.filter((issue) => issue.severity === 'blocking');
  const participationIssues = issues.filter(
    (issue) =>
      issue.severity !== 'blocking' &&
      (issue.code === 'AXIS_DISABLED_HAS_VALUE' || issue.code === 'CONTROLLED_PARAMETERS_OPTIONAL_EMPTY'),
  );

  return {
    valid: blockingIssues.length === 0,
    issues,
    projectionEligibility: {
      expandedMetrics: blockingIssues.length === 0 && participationIssues.length === 0,
      reasons: participationIssues.map((issue) => issue.message),
    },
  };
}

export function assertAccountingPositionInvariants(position: AccountingPosition): AccountingPositionInvariantResult {
  const result = evaluateAccountingPositionInvariants(position);
  if (!result.valid) {
    throw new AccountingPositionInvariantError(result.issues.filter((issue) => issue.severity === 'blocking'));
  }
  return result;
}

export function isEligibleForExpandedAnalytics(position: AccountingPosition): boolean {
  return evaluateAccountingPositionInvariants(position).projectionEligibility.expandedMetrics;
}
