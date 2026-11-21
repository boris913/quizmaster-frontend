'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { filenameFromContentDisposition, resultsCsvFilename } from '@/lib/sessionResults';
import type { SessionResults } from '@/types';

/** `not_found` : session inexistante ou demandeur non créateur (le backend répond 404 dans les deux cas). */
export type SessionResultsError = 'not_found' | 'unknown';

function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

/** Déclenche le téléchargement d'un Blob sous le nom donné. */
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Laisse au navigateur le temps de démarrer le téléchargement avant de libérer l'URL.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Rapport d'une session (GET /api/sessions/:id/results) et export CSV
 * (GET /api/sessions/:id/results.csv). Les deux appels passent par le client `api`,
 * qui ajoute le jeton JWT : un simple lien <a href> n'enverrait pas l'en-tête Authorization.
 */
export function useSessionResults(sessionId: string | undefined) {
  const [results, setResults] = useState<SessionResults | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<SessionResultsError | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<'notFound' | 'generic' | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api
      .get<SessionResults>(`/sessions/${sessionId}/results`)
      .then(({ data }) => {
        if (!cancelled) setResults(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResults(null);
        setError(httpStatus(err) === 404 ? 'not_found' : 'unknown');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const exportCsv = useCallback(async () => {
    if (!sessionId) return;
    setIsExporting(true);
    setExportError(null);
    try {
      const response = await api.get<Blob>(`/sessions/${sessionId}/results.csv`, {
        responseType: 'blob',
      });
      const filename =
        filenameFromContentDisposition(response.headers?.['content-disposition']) ??
        resultsCsvFilename(results?.session);
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8' });
      saveBlob(blob, filename);
    } catch (err) {
      // Clé de traduction (report.exportErrors.*) : le composant affiche le message.
      setExportError(httpStatus(err) === 404 ? 'notFound' : 'generic');
    } finally {
      setIsExporting(false);
    }
  }, [sessionId, results]);

  return { results, isLoading, error, refetch, exportCsv, isExporting, exportError };
}
