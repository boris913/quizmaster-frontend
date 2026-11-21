'use client';

import { useId, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Download, FileSpreadsheet, Search, Upload } from 'lucide-react';
import {
  IMPORT_TEMPLATE_URL,
  downloadImportTemplate,
  formatBytes,
  importErrorMessage,
  importSummary,
  importQuizFile,
  resolveImportFile,
  type FileImportFormat,
  type ImportReport,
} from '@/lib/quizSharing';

interface FileQuizImporterProps {
  /** `spreadsheet` : CSV ou XLSX au format du modèle ; `kahoot` : export XLSX de Kahoot. */
  source: 'spreadsheet' | 'kahoot';
  /** Fournit l'identifiant du quiz cible (créé au premier appel si besoin). */
  getQuizId: () => Promise<string>;
  /** Appelé après un import réel qui a enregistré au moins une question. */
  onImported: (quizId: string, imported: number) => void;
  /** « Annuler » sur l'aperçu, ou import réel sans aucune question enregistrée. */
  onDiscard: () => void;
}

/**
 * Import d'un fichier en deux temps : aperçu (`dryRun`) avec le nombre de questions valides
 * et les erreurs par ligne, puis import réel sur confirmation uniquement.
 */
export function FileQuizImporter({ source, getQuizId, onImported, onDiscard }: FileQuizImporterProps) {
  const t = useTranslations('sharing');
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<FileImportFormat | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const reset = () => {
    setReport(null);
    setError(null);
  };

  const handleFile = (selected: File | undefined) => {
    reset();
    setFile(null);
    setFormat(null);
    setFileError(null);
    if (!selected) return;
    const resolved = resolveImportFile(selected, source, t);
    if ('error' in resolved) {
      setFileError(resolved.error);
      return;
    }
    setFile(selected);
    setFormat(resolved.format);
  };

  const run = async (dryRun: boolean) => {
    if (!file || !format) return;
    setBusy(dryRun ? 'preview' : 'import');
    setError(null);
    try {
      const quizId = await getQuizId();
      const result = await importQuizFile(quizId, file, format, dryRun);
      if (dryRun) setReport(result);
      else if (result.imported > 0) onImported(quizId, result.imported);
      else {
        setReport(null);
        onDiscard();
        setError(t('import.nothingImported'));
      }
    } catch (e) {
      setError(importErrorMessage(e, t));
    } finally {
      setBusy(null);
    }
  };

  const handleTemplate = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setTemplateError(null);
    try {
      await downloadImportTemplate();
    } catch {
      setTemplateError(t('import.templateError'));
    }
  };

  const accept = source === 'kahoot' ? '.xlsx' : '.csv,.xlsx';

  const bold = (chunks: React.ReactNode) => <strong>{chunks}</strong>;

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2 text-h3">
        <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
        {source === 'kahoot' ? t('import.titleKahoot') : t('import.titleSpreadsheet')}
      </div>

      {source === 'spreadsheet' ? (
        <div className="bg-background p-4 rounded-lg text-small text-ink-secondary space-y-2">
          <p>{t.rich('import.spreadsheetHelp', { b: bold })}</p>
          <a
            href={IMPORT_TEMPLATE_URL}
            onClick={handleTemplate}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            {t('import.template')}
          </a>
          {templateError && (
            <p role="alert" className="text-danger">
              {templateError}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-background p-4 rounded-lg text-small text-ink-secondary">
          <p>{t.rich('import.kahootHelp', { b: bold })}</p>
        </div>
      )}

      <div>
        <label htmlFor={inputId} className="block text-small font-medium text-ink-secondary">
          {source === 'kahoot' ? t('import.fileKahoot') : t('import.fileSpreadsheet')}
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="text-small"
          />
          {file && (
            <span className="text-small text-success">
              {t('import.fileInfo', { name: file.name, size: formatBytes(file.size, t) })}
            </span>
          )}
        </div>
        <p className="mt-1 text-caption text-ink-secondary">{t('import.maxSize')}</p>
        {fileError && (
          <p role="alert" className="mt-2 rounded-md bg-danger-50 p-3 text-small text-danger">
            {fileError}
          </p>
        )}
      </div>

      {!report && (
        <Button onClick={() => run(true)} isLoading={busy === 'preview'} disabled={!file || busy !== null}>
          <Search className="w-4 h-4" aria-hidden="true" />
          {t('import.preview')}
        </Button>
      )}

      {report && (
        <section aria-label={t('import.previewAria')} className="space-y-3" data-testid="import-preview">
          <p className="font-medium" role="status">
            {report.valid === 0 ? t('import.noValid') : importSummary(report, t)}
          </p>
          {report.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-small text-danger">{t('import.errorsIntro', { count: report.errors.length })}</p>
              <div className="max-h-72 overflow-auto rounded-md border border-borderc">
                <table className="w-full text-left text-small">
                  <caption className="sr-only">{t('import.errorsCaption')}</caption>
                  <thead className="bg-background">
                    <tr>
                      <th scope="col" className="px-3 py-2 w-20">
                        {t('import.colRow')}
                      </th>
                      <th scope="col" className="px-3 py-2">
                        {t('import.colMessage')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.errors.map((err, i) => (
                      <tr key={i} className="border-t border-borderc">
                        <td className="px-3 py-2 font-mono">{err.row ?? '—'}</td>
                        <td className="px-3 py-2">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => run(false)}
              isLoading={busy === 'import'}
              disabled={report.valid === 0 || busy !== null}
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              {t('import.confirm', { count: report.valid })}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onDiscard();
              }}
              disabled={busy !== null}
            >
              {t('import.cancel')}
            </Button>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-danger-50 p-3 text-small text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
