'use client';

import { useId, useState } from 'react';
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
    const resolved = resolveImportFile(selected, source);
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
        setError('Aucune question n’a été importée : corrigez le fichier puis relancez l’aperçu.');
      }
    } catch (e) {
      setError(importErrorMessage(e));
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
      setTemplateError('Le modèle n’a pas pu être téléchargé. Réessayez.');
    }
  };

  const accept = source === 'kahoot' ? '.xlsx' : '.csv,.xlsx';

  return (
    <Card className="p-6 space-y-5">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <FileSpreadsheet className="w-5 h-5" aria-hidden="true" />
        {source === 'kahoot' ? 'Importer un export Kahoot' : 'Importer depuis un tableur'}
      </div>

      {source === 'spreadsheet' ? (
        <div className="bg-background p-4 rounded-lg text-sm text-ink-secondary space-y-2">
          <p>
            Un fichier <strong>.csv</strong> ou <strong>.xlsx</strong> : une question par ligne, avec les colonnes du
            modèle (énoncé, type, options, bonnes réponses, temps, points).
          </p>
          <a
            href={IMPORT_TEMPLATE_URL}
            onClick={handleTemplate}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Télécharger le modèle CSV
          </a>
          {templateError && (
            <p role="alert" className="text-danger">
              {templateError}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-background p-4 rounded-lg text-sm text-ink-secondary space-y-1">
          <p>
            Dans Kahoot, ouvrez votre kahoot puis exportez-le au format tableur (<strong>.xlsx</strong>). Les questions
            à choix, le temps et les bonnes réponses sont repris ; les images ne le sont pas.
          </p>
        </div>
      )}

      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-secondary">
          {source === 'kahoot' ? 'Fichier Kahoot (.xlsx)' : 'Fichier tableur (.csv ou .xlsx)'}
        </label>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            type="file"
            accept={accept}
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="text-sm"
          />
          {file && (
            <span className="text-sm text-success">
              {file.name} ({formatBytes(file.size)})
            </span>
          )}
        </div>
        <p className="mt-1 text-caption text-ink-secondary">2 Mo maximum.</p>
        {fileError && (
          <p role="alert" className="mt-2 rounded-md bg-danger-50 p-3 text-small text-danger">
            {fileError}
          </p>
        )}
      </div>

      {!report && (
        <Button onClick={() => run(true)} isLoading={busy === 'preview'} disabled={!file || busy !== null}>
          <Search className="w-4 h-4 mr-2" aria-hidden="true" />
          Prévisualiser l&apos;import
        </Button>
      )}

      {report && (
        <section aria-label="Aperçu de l’import" className="space-y-3" data-testid="import-preview">
          <p className="font-medium" role="status">
            {report.valid === 0 ? 'Aucune question valide dans ce fichier.' : importSummary(report)}
          </p>
          {report.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-small text-danger">
                {report.errors.length} erreur{report.errors.length > 1 ? 's' : ''} : les lignes concernées seront
                ignorées. Corrigez le fichier puis relancez l&apos;aperçu, ou importez seulement les questions
                valides.
              </p>
              <div className="max-h-72 overflow-auto rounded-md border border-borderc">
                <table className="w-full text-left text-small">
                  <caption className="sr-only">Erreurs par ligne</caption>
                  <thead className="bg-background">
                    <tr>
                      <th scope="col" className="px-3 py-2 w-20">Ligne</th>
                      <th scope="col" className="px-3 py-2">Message</th>
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
              <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
              {`Importer ${report.valid} question${report.valid > 1 ? 's' : ''}`}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                onDiscard();
              }}
              disabled={busy !== null}
            >
              Annuler
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
