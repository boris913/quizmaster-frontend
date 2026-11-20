'use client';

import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortableListItem {
  id: string;
  /** Texte lu par les lecteurs d'écran et repris dans les annonces de déplacement. */
  label: string;
}

interface SortableListProps<T extends SortableListItem> {
  items: T[];
  /** Nouvel ordre des ids après un déplacement. */
  onChange: (ids: string[]) => void;
  /** Contenu de chaque ligne (par défaut : `label`). */
  renderItem?: (item: T, index: number) => ReactNode;
  disabled?: boolean;
  /** Nom accessible de la liste. */
  ariaLabel: string;
  className?: string;
  /** `large` : cibles tactiles plus grandes (écran joueur). */
  size?: 'default' | 'large';
}

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Liste réordonnable sans dépendance :
 * - **tactile / souris / stylet** : glisser la poignée (Pointer Events, `touch-action: none`
 *   sur la poignée seulement, pour que la page reste défilable ailleurs) ;
 * - **clavier** : flèches haut/bas sur la poignée, ou boutons « Monter » / « Descendre » ;
 * - chaque déplacement est annoncé dans une région `aria-live`.
 */
export function SortableList<T extends SortableListItem>({
  items,
  onChange,
  renderItem,
  disabled = false,
  ariaLabel,
  className,
  size = 'default',
}: SortableListProps<T>) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const isLarge = size === 'large';

  const announce = (item: T, index: number) =>
    setAnnouncement(`« ${item.label} » déplacé en position ${index + 1} sur ${items.length}.`);

  const moveTo = (from: number, to: number) => {
    if (disabled || to < 0 || to >= items.length || from === to) return;
    const next = move(items, from, to);
    onChange(next.map((i) => i.id));
    announce(items[from], to);
  };

  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveTo(index, index - 1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTo(index, index + 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      moveTo(index, 0);
    } else if (event.key === 'End') {
      event.preventDefault();
      moveTo(index, items.length - 1);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (disabled || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture indisponible (environnement de test) : le glisser reste suivi par la poignée.
    }
    setDraggingId(id);
  };

  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!draggingId) return;
    const from = items.findIndex((i) => i.id === draggingId);
    if (from < 0) return;
    // Position cible : nombre d'autres lignes dont le milieu est au-dessus du pointeur.
    let target = 0;
    items.forEach((item) => {
      if (item.id === draggingId) return;
      const rect = rowRefs.current.get(item.id)?.getBoundingClientRect();
      if (rect && rect.height > 0 && event.clientY > rect.top + rect.height / 2) target += 1;
    });
    if (target !== from) {
      onChange(move(items, from, target).map((i) => i.id));
    }
  };

  const endDrag = () => {
    if (!draggingId) return;
    const index = items.findIndex((i) => i.id === draggingId);
    if (index >= 0) announce(items[index], index);
    setDraggingId(null);
  };

  return (
    <div className={className}>
      <ol aria-label={ariaLabel} className={cn('space-y-2', isLarge && 'space-y-3')}>
        {items.map((item, index) => {
          const isDragging = draggingId === item.id;
          return (
            <li
              key={item.id}
              ref={(el) => {
                if (el) rowRefs.current.set(item.id, el);
                else rowRefs.current.delete(item.id);
              }}
              data-testid={`sortable-item-${item.id}`}
              className={cn(
                'flex items-center gap-2 rounded-md border-2 bg-surface transition-shadow',
                isLarge ? 'px-2 py-2' : 'px-1.5 py-1',
                isDragging ? 'border-primary shadow-lg relative z-10' : 'border-borderc',
                disabled && 'opacity-70'
              )}
            >
              <button
                type="button"
                disabled={disabled}
                aria-label={`Déplacer « ${item.label} », position ${index + 1} sur ${items.length}. Flèches haut et bas pour déplacer.`}
                onKeyDown={(e) => onHandleKeyDown(e, index)}
                onPointerDown={(e) => onPointerDown(e, item.id)}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onLostPointerCapture={endDrag}
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-md text-ink-secondary touch-none select-none',
                  'hover:bg-black/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isDragging ? 'cursor-grabbing' : 'cursor-grab',
                  isLarge ? 'h-11 w-11' : 'h-9 w-9'
                )}
              >
                <GripVertical className="h-5 w-5" aria-hidden />
              </button>
              <span
                className={cn(
                  'font-mono text-small font-semibold min-w-7 h-7 flex shrink-0 items-center justify-center rounded-md bg-black/[0.05] text-ink-secondary'
                )}
                aria-hidden
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">{renderItem ? renderItem(item, index) : item.label}</div>
              <div className="flex shrink-0 flex-col">
                <button
                  type="button"
                  disabled={disabled || index === 0}
                  onClick={() => moveTo(index, index - 1)}
                  aria-label={`Monter « ${item.label} »`}
                  className={cn(
                    'flex items-center justify-center rounded text-ink-secondary hover:bg-black/[0.05] disabled:opacity-30',
                    isLarge ? 'h-8 w-11' : 'h-6 w-8'
                  )}
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={disabled || index === items.length - 1}
                  onClick={() => moveTo(index, index + 1)}
                  aria-label={`Descendre « ${item.label} »`}
                  className={cn(
                    'flex items-center justify-center rounded text-ink-secondary hover:bg-black/[0.05] disabled:opacity-30',
                    isLarge ? 'h-8 w-11' : 'h-6 w-8'
                  )}
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <p aria-live="assertive" className="sr-only" data-testid="sortable-announcement">
        {announcement}
      </p>
    </div>
  );
}
