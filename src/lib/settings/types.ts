import { SettingKey } from '@prisma/client';

export type DataPolicies = {
  supervisorBackdateDays: number;
  requireReasonOnCancel: boolean;
  allowNegativeStock: boolean;
  displayDecimals: number;
  enablePeriodLocks: boolean;
};

export const POLICY_KEY_MAP: Record<SettingKey, keyof DataPolicies> = {
  SUPERVISOR_BACKDATE_DAYS: 'supervisorBackdateDays',
  REQUIRE_REASON_ON_CANCEL: 'requireReasonOnCancel',
  ALLOW_NEGATIVE_STOCK: 'allowNegativeStock',
  DISPLAY_DECIMALS: 'displayDecimals',
  ENABLE_PERIOD_LOCKS: 'enablePeriodLocks',
};
