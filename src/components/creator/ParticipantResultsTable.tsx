'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
  formatPercent,
  formatSeconds,
  sortParticipants,
  type ParticipantSortKey,
  type SortDirection,
} from '@/lib/sessionResults';
import type { SessionResultsParticipant } from '@/types';
import { cn } from '@/lib/utils';

interface ParticipantResultsTableProps {
  participants: SessionResultsParticipant[];
  /** Faux si le quiz ne contient aucune question notée : la précision n'est alors pas affichée. */
  showAccuracy?: boolean;
}

interface Column {
  key: ParticipantSortKey;
  label: string;
  /** Sens du premier clic : le « meilleur » en haut. */
  firstDirection: SortDirection;
  numeric: boolean;
}

const COLUMNS: Omit<Column, 'label'>[] = [
  { key: 'pseudo', firstDirection: 'asc', numeric: false },
  { key: 'score', firstDirection: 'desc', numeric: true },
  { key: 'accuracy', firstDirection: 'desc', numeric: true },
  { key: 'avgTimeMs', firstDirection: 'asc', numeric: true },
  { key: 'timeouts', firstDirection: 'desc', numeric: true },
];

/** Tableau des élèves, triable en cliquant sur les en-têtes (aria-sort pour les lecteurs d'écran). */
export function ParticipantResultsTable({
  participants,
  showAccuracy = true,
}: ParticipantResultsTableProps) {
  const t = useTranslations('report');
  const locale = useLocale();
  const [sortKey, setSortKey] = useState<ParticipantSortKey>('score');
  const [direction, setDirection] = useState<SortDirection>('desc');

  const columns: Column[] = (showAccuracy ? COLUMNS : COLUMNS.filter((c) => c.key !== 'accuracy')).map(
    (c) => ({ ...c, label: t(`table.${c.key}`) })
  );
  const rows = useMemo(
    () => sortParticipants(participants, sortKey, direction),
    [participants, sortKey, direction]
  );

  const onSort = (column: Column) => {
    if (column.key === sortKey) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(column.key);
      setDirection(column.firstDirection);
    }
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-borderc bg-surface">
      <table className="w-full min-w-[560px] text-small">
        <caption className="sr-only">
          {t('table.caption')}
        </caption>
        <thead className="bg-ink/[0.02] text-ink-secondary">
          <tr>
            {columns.map((column) => {
              const active = column.key === sortKey;
              const Icon = !active ? ArrowUpDown : direction === 'asc' ? ArrowUp : ArrowDown;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                  className={cn('px-4 py-2 font-medium', column.numeric ? 'text-right' : 'text-left')}
                >
                  <button
                    type="button"
                    onClick={() => onSort(column)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active && 'text-ink'
                    )}
                  >
                    {column.label}
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.participantId} className="border-t border-borderc">
              <th scope="row" className="px-4 py-2 text-left font-medium text-ink">
                {p.pseudo}
              </th>
              <td className="px-4 py-2 text-right tabular-nums">{p.score}</td>
              {showAccuracy && (
                <td className="px-4 py-2 text-right tabular-nums">{formatPercent(p.accuracy, locale)}</td>
              )}
              <td className="px-4 py-2 text-right tabular-nums">{formatSeconds(p.avgTimeMs, locale)}</td>
              <td className="px-4 py-2 text-right tabular-nums">{p.timeouts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
