import { createImportSyncUseCase } from '@/lib/application/import';
import { CommitOptions } from '@/lib/import/types';

const importSyncUseCase = createImportSyncUseCase();

export async function commitImportJob(params: {
  jobId: string;
  userId: string;
  options?: CommitOptions;
}): Promise<{ created: Record<string, number>; openingCreated: boolean }> {
  const result = await importSyncUseCase.apply({
    jobId: params.jobId,
    userId: params.userId,
    options: params.options,
  });

  return {
    created: result.applySummary,
    openingCreated: result.opening.created,
  };
}

export async function rollbackImportJob(params: { jobId: string; userId: string }): Promise<{ rolledBack: boolean }> {
  const result = await importSyncUseCase.rollback(params);
  return { rolledBack: result.rolledBack };
}
