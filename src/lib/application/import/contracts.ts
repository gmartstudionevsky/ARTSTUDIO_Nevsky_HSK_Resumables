import { TxType } from '@prisma/client';

import { CommitOptions, ImportIssue, ImportSummary, ImportSyncPlanRow, NormalizedImportPayload } from '@/lib/import/types';
import { ProjectionUpdateReceipt } from '@/lib/read-models/projections/contracts';

export interface ImportPreviewResult {
  jobId: string;
  summary: ImportSummary;
  errors: ImportIssue[];
  warnings: ImportIssue[];
  syncRows: ImportSyncPlanRow[];
  openingSemantics: {
    detectedOpeningRows: number;
    defaultMode: 'OPENING' | 'IN';
    assumption: string;
  };
}

export interface ImportApplyCommand {
  jobId: string;
  userId: string;
  options?: CommitOptions & {
    openingEventMode?: 'OPENING' | 'IN';
  };
}

export interface ImportApplyResult {
  previewSummary: ImportSummary;
  applySummary: Record<string, number>;
  blockingFailures: ImportIssue[];
  warnings: ImportIssue[];
  opening: {
    created: boolean;
    mode: TxType | null;
    lines: number;
  };
  projections: ProjectionUpdateReceipt[];
  recovery: {
    rollbackAvailable: boolean;
    strategy: 'ROLLBACK' | 'RESET_RESYNC';
  };
}

export interface ImportRollbackResult {
  rolledBack: boolean;
  projections: ProjectionUpdateReceipt[];
}

export interface ImportSyncUseCase {
  previewFromWorkbook(input: { userId: string; filename: string; buffer: ArrayBuffer }): Promise<ImportPreviewResult>;
  apply(command: ImportApplyCommand): Promise<ImportApplyResult>;
  rollback(input: { jobId: string; userId: string }): Promise<ImportRollbackResult>;
  getDraftPayload(jobId: string, userId: string): Promise<NormalizedImportPayload>;
}
