'use client';

import { useParams } from 'next/navigation';
import { AssignmentPlayer } from '@/components/player/AssignmentPlayer';
import { normalizeSessionCode } from '@/lib/sessionCode';

function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Devoir à faire à son rythme : /player/assignment/XXXXXX (lien ou QR partagé par le prof). */
export default function AssignmentPage() {
  const params = useParams();
  const raw = Array.isArray(params?.code) ? params.code[0] : (params?.code as string | undefined);
  const code = normalizeSessionCode(decode(raw ?? ''));
  // `key` : un autre code repart d'un état vierge.
  return <AssignmentPlayer key={code} code={code} />;
}
