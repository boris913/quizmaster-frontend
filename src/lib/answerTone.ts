/**
 * Teinte associée à une réponse (A, B, C, D…). La lettre reste toujours
 * affichée : la couleur aide à repérer, elle ne porte jamais seule l'information.
 * Classes écrites en entier pour que Tailwind les détecte.
 */
const TONES = [
  { bg: 'bg-answer-a', border: 'border-answer-a', text: 'text-answer-a', soft: 'bg-answer-a/10' },
  { bg: 'bg-answer-b', border: 'border-answer-b', text: 'text-answer-b', soft: 'bg-answer-b/10' },
  { bg: 'bg-answer-c', border: 'border-answer-c', text: 'text-answer-c', soft: 'bg-answer-c/10' },
  { bg: 'bg-answer-d', border: 'border-answer-d', text: 'text-answer-d', soft: 'bg-answer-d/10' },
] as const;

export type AnswerTone = (typeof TONES)[number];

export function answerTone(id: string, fallbackIndex = 0): AnswerTone {
  const code = (id || '').trim().toUpperCase().charCodeAt(0) - 65; // 'A' -> 0
  const index = code >= 0 && code < 26 ? code : fallbackIndex;
  return TONES[index % TONES.length];
}
