import { AccountingPosition, ItemLegacyWriteDraft } from '@/lib/domain/accounting-position';
import { WriteFlowContext, WriteFlowResult } from '@/lib/application/write-flow/types';

export interface CreateAccountingPositionCommand extends ItemLegacyWriteDraft {
  initialStock?: {
    enabled: boolean;
    qty?: number;
    unitId?: string;
    occurredAt?: string | null;
    comment?: string | null;
  };
  context?: WriteFlowContext;
}

export interface UpdateAccountingPositionCommand {
  id: string;
  changes: Partial<ItemLegacyWriteDraft>;
  context?: WriteFlowContext;
}

export interface SetAccountingPositionActiveStateCommand {
  id: string;
  isActive: boolean;
  context?: WriteFlowContext;
}

export interface AccountingPositionWriteResult {
  item: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  };
  accountingPosition: AccountingPosition;
  transactionId?: string;
}

export type AccountingPositionUseCaseResult = WriteFlowResult<AccountingPositionWriteResult>;

export interface AccountingPositionWriteService {
  create(command: CreateAccountingPositionCommand): Promise<AccountingPositionUseCaseResult>;
  update(command: UpdateAccountingPositionCommand): Promise<AccountingPositionUseCaseResult>;
  setActiveState(command: SetAccountingPositionActiveStateCommand): Promise<AccountingPositionUseCaseResult>;
}
