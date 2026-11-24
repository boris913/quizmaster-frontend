/**
 * Sonde de santé pour le HEALTHCHECK Docker et Coolify : répond 200 sans dépendre du backend,
 * de la langue ni d'un cookie. Volontairement minimale (aucune information sur l'environnement).
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok' },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );
}
