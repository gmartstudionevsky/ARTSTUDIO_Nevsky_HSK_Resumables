import { DataPolicies } from '@/lib/settings/types';

export const DEFAULT_POLICIES: DataPolicies = {
  supervisorBackdateDays: 3,
  requireReasonOnCancel: true,
  allowNegativeStock: true,
  displayDecimals: 2,
  enablePeriodLocks: false,
};
