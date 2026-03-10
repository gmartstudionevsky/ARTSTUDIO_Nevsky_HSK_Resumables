'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { ImportIssuesTable } from '@/components/admin/import/ImportIssuesTable';
import { ImportJobsList } from '@/components/admin/import/ImportJobsList';
import { ImportSummary } from '@/components/admin/import/ImportSummary';
import { ImportUploadCard } from '@/components/admin/import/ImportUploadCard';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import {
  ImportIssue,
  ImportSummary as Summary,
  ImportSyncAction,
  ImportSyncPlanRow,
} from '@/lib/import/types';

type JobsResponse = {
  items: Array<{
    id: string;
    createdAt: string;
    status: 'DRAFT' | 'COMMITTED' | 'FAILED';
    sourceFilename: string;
    error: string | null;
    canRollback?: boolean;
    rollbackHint?: string | null;
    rolledBackAt?: string | null;
  }>;
};

export default function AdminImportPage(): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCommit, setLoadingCommit] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [errors, setErrors] = useState<ImportIssue[]>([]);
  const [warnings, setWarnings] = useState<ImportIssue[]>([]);
  const [syncRows, setSyncRows] = useState<ImportSyncPlanRow[]>([]);
  const [syncMode, setSyncMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [unresolvedBehavior, setUnresolvedBehavior] = useState<'CREATE' | 'SKIP'>('CREATE');
  const [manualDecisions, setManualDecisions] = useState<
    Record<number, { action: ImportSyncAction; itemId?: string }>
  >({});
  const [createOpening, setCreateOpening] = useState(true);
  const [openingDate, setOpeningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [markup, setMarkup] = useState<{
    openingColumn: string | null;
    directorySheet: string | null;
    unitsSheet: string | null;
  } | null>(null);
  const [toast, setToast] = useState('');
  const [jobs, setJobs] = useState<JobsResponse['items']>([]);
  const [rollingBackJobId, setRollingBackJobId] = useState<string | null>(null);

  const hasUnresolvedRows = useMemo(
    () => syncRows.some((row) => row.status === 'NEEDS_REVIEW'),
    [syncRows],
  );

  async function loadJobs(): Promise<void> {
    const response = await fetch('/api/admin/import/jobs?limit=10&offset=0', { cache: 'no-store' });
    const json = (await response.json().catch(() => ({ items: [] }))) as JobsResponse;
    if (response.ok) setJobs(json.items);
  }

  useEffect(() => {
    void loadJobs();
  }, []);

  async function handlePreview(): Promise<void> {
    if (!file) return;
    setLoadingPreview(true);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/admin/import/xlsx/preview', {
      method: 'POST',
      body: formData,
    });
    const json = (await response.json().catch(() => null)) as {
      jobId: string;
      summary: Summary;
      errors: ImportIssue[];
      warnings: ImportIssue[];
      syncRows: ImportSyncPlanRow[];
      markup?: {
        openingColumn: string | null;
        directorySheet: string | null;
        unitsSheet: string | null;
      };
      error?: string;
    } | null;
    setLoadingPreview(false);

    if (!response.ok || !json) {
      setToast(json?.error ?? 'Ошибка предпросмотра');
      return;
    }

    setJobId(json.jobId);
    setSummary(json.summary);
    setErrors(json.errors);
    setWarnings(json.warnings);
    setSyncRows(json.syncRows ?? []);
    setManualDecisions({});
    setMarkup(json.markup ?? null);
    await loadJobs();
  }

  async function handleRollback(jobIdToRollback: string): Promise<void> {
    setRollingBackJobId(jobIdToRollback);
    const response = await fetch('/api/admin/import/xlsx/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: jobIdToRollback }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setRollingBackJobId(null);

    if (!response.ok) {
      setToast(json?.error ?? 'Ошибка отката импорта');
      return;
    }

    setToast('Импорт откачен');
    await loadJobs();
  }

  async function handleCommit(): Promise<void> {
    if (!jobId) return;
    setLoadingCommit(true);

    const decisions = Object.entries(manualDecisions).map(([rowNumber, value]) => ({
      rowNumber: Number(rowNumber),
      ...value,
    }));

    const response = await fetch('/api/admin/import/xlsx/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        options: { createOpening, openingDate, syncMode, unresolvedBehavior, decisions },
      }),
    });
    const json = (await response.json().catch(() => null)) as { error?: string } | null;
    setLoadingCommit(false);

    if (!response.ok) {
      setToast(json?.error ?? 'Ошибка импорта');
      return;
    }

    setToast('Импорт выполнен');
    await loadJobs();
  }

  function updateManualAction(row: ImportSyncPlanRow, action: ImportSyncAction): void {
    if (action === 'AUTO') {
      const preferredId = row.candidates[0]?.itemId;
      if (!preferredId) return;
      setManualDecisions((prev) => ({
        ...prev,
        [row.rowNumber]: { action: 'AUTO', itemId: preferredId },
      }));
      return;
    }
    setManualDecisions((prev) => ({ ...prev, [row.rowNumber]: { action } }));
  }

  function updateManualItem(rowNumber: number, itemId: string): void {
    setManualDecisions((prev) => ({ ...prev, [rowNumber]: { action: 'AUTO', itemId } }));
  }

  return (
    <main className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-text">Импорт</h1>
      </header>

      <ImportUploadCard
        onFileChange={setFile}
        onPreview={handlePreview}
        loading={loadingPreview}
        hasFile={Boolean(file)}
      />

      {summary ? (
        <section className="space-y-4">
          <ImportSummary summary={summary} />
          <p className="text-sm text-muted">
            Синхронизация каталога позиций со складом выполняется автоматически, при спорных
            совпадениях можно вручную выбрать действие.
          </p>

          <div className="grid gap-3 md:grid-cols-4">
            <Select
              label="Режим синхронизации"
              value={syncMode}
              onChange={(event) => setSyncMode(event.target.value as 'AUTO' | 'MANUAL')}
            >
              <option value="AUTO">Автоматический</option>
              <option value="MANUAL">Ручной (с решениями)</option>
            </Select>
            <Select
              label="Если данных не хватает"
              value={unresolvedBehavior}
              onChange={(event) => setUnresolvedBehavior(event.target.value as 'CREATE' | 'SKIP')}
            >
              <option value="CREATE">Предложить добавить (создавать новые)</option>
              <option value="SKIP">Пропускать без отмены импорта</option>
            </Select>
            <label className="flex items-center gap-2 text-sm text-text md:pt-8">
              <input
                type="checkbox"
                checked={createOpening}
                onChange={(event) => setCreateOpening(event.target.checked)}
              />
              Создать стартовую инвентаризацию
            </label>
            <label className="flex flex-col gap-1 text-sm text-text">
              Дата начала учета
              <input
                type="date"
                className="min-h-10 rounded-md border border-border bg-surface px-3"
                value={openingDate}
                onChange={(event) => setOpeningDate(event.target.value)}
                disabled={!createOpening}
              />
            </label>
          </div>

          <div className="overflow-x-auto rounded-md border border-border p-3">
            <p className="mb-2 text-sm font-medium text-text">Разметка всех строк импорта</p>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-2 py-2">Строка</th>
                  <th className="px-2 py-2">Позиция</th>
                  <th className="px-2 py-2">Статус</th>
                  <th className="px-2 py-2">Выбранное сопоставление</th>
                </tr>
              </thead>
              <tbody>
                {syncRows.map((row) => (
                  <tr key={`all-${row.rowNumber}`} className="border-b border-border/60 align-top">
                    <td className="px-2 py-2">{row.rowNumber}</td>
                    <td className="px-2 py-2">
                      {row.sourceCode} — {row.sourceName}
                    </td>
                    <td className="px-2 py-2">{row.status}</td>
                    <td className="px-2 py-2">
                      {row.selectedReason ?? 'Будет создана новая позиция'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasUnresolvedRows ? (
            <div className="overflow-x-auto rounded-md border border-border p-3">
              <p className="mb-2 text-sm font-medium text-text">
                Спорные сопоставления (можно выбрать: связать, создать, пропустить)
              </p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-2 py-2">Позиция импорта</th>
                    <th className="px-2 py-2">Кандидаты</th>
                    <th className="px-2 py-2">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {syncRows
                    .filter((row) => row.status === 'NEEDS_REVIEW')
                    .map((row) => {
                      const decision = manualDecisions[row.rowNumber];
                      return (
                        <tr key={row.rowNumber} className="border-b border-border/60 align-top">
                          <td className="px-2 py-2">
                            <p className="font-medium">
                              {row.sourceCode} — {row.sourceName}
                            </p>
                            <p className="text-xs text-muted">
                              {row.sourceCategory || 'Без раздела'}
                            </p>
                          </td>
                          <td className="px-2 py-2">
                            {row.candidates.length === 0 ? (
                              <span className="text-xs text-muted">Кандидатов нет</span>
                            ) : (
                              <Select
                                value={decision?.itemId ?? row.candidates[0]?.itemId ?? ''}
                                onChange={(event) =>
                                  updateManualItem(row.rowNumber, event.target.value)
                                }
                              >
                                {row.candidates.map((candidate) => (
                                  <option key={candidate.itemId} value={candidate.itemId}>
                                    {candidate.code} — {candidate.name} ({candidate.reason})
                                  </option>
                                ))}
                              </Select>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <Select
                              value={decision?.action ?? 'CREATE'}
                              onChange={(event) =>
                                updateManualAction(row, event.target.value as ImportSyncAction)
                              }
                            >
                              <option value="AUTO">Сопоставить с выбранной</option>
                              <option value="CREATE">Создать новую</option>
                              <option value="SKIP">Пропустить</option>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : null}

          {markup ? (
            <p className="text-xs text-muted">
              Разметка импорта: лист справочника — {markup.directorySheet ?? 'не найден'}, лист
              единиц — {markup.unitsSheet ?? 'не найден'}, колонка стартовых остатков —{' '}
              {markup.openingColumn ?? 'не найдена'}.
            </p>
          ) : null}
          <ImportIssuesTable errors={errors} warnings={warnings} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleCommit}
              loading={loadingCommit}
              disabled={errors.length > 0 || !jobId}
            >
              Импортировать
            </Button>
            <Link
              href="/catalog"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:bg-surface/80"
            >
              Перейти в Каталог позиций
            </Link>
            <Link
              href="/stock"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-text hover:bg-surface/80"
            >
              Перейти на Склад
            </Link>
          </div>
        </section>
      ) : null}

      <ImportJobsList jobs={jobs} onRollback={handleRollback} rollingBackJobId={rollingBackJobId} />
      {toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}
    </main>
  );
}
