/**
 * Utilitaires autour du code de session (champ `password` d'une session).
 *
 * Le format exact du code est défini par le backend (6 caractères aujourd'hui, alphabet sans
 * caractères ambigus prévu par boris913/quizmaster-backend#3) : on ne dépend donc pas de sa
 * longueur exacte côté client. On se contente de le normaliser (majuscules, sans espaces).
 */

/** Longueurs acceptées côté client, volontairement larges : la validation finale est serveur. */
export const SESSION_CODE_MIN_LENGTH = 4;
export const SESSION_CODE_MAX_LENGTH = 12;

/**
 * Même normalisation que le backend (boris913/quizmaster-backend#3) : trim, suppression de tous
 * les espaces (y compris insécables), majuscules. L'alphabet (sans 0 O 1 I L) n'est pas imposé
 * ici : un code invalide est refusé par le serveur avec un message explicite.
 */
export function normalizeSessionCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, '').toUpperCase();
}

/**
 * URL publique de l'application, sans slash final.
 * `NEXT_PUBLIC_APP_URL` en priorité (utile quand le prof ouvre l'app via `localhost` mais que les
 * élèves doivent passer par l'IP ou le domaine public), sinon l'origine courante du navigateur.
 */
export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  const base =
    fromEnv && fromEnv.trim() !== ''
      ? fromEnv.trim()
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';
  return base.replace(/\/+$/, '');
}

/** Lien direct pour rejoindre une session : `${APP_URL}/player/join?code=XXXXXX`. */
export function buildJoinUrl(code: string, baseUrl: string = getAppBaseUrl()): string {
  return `${baseUrl}/player/join?code=${encodeURIComponent(normalizeSessionCode(code))}`;
}
