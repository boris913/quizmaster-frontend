# Kwizora — frontend

Application Next.js 14 (App Router) de Kwizora : création de quiz, sessions en direct et participation des joueurs.

Stack : Next.js 14.0.3, React 18, TypeScript, Zustand, Tailwind CSS, framer-motion, socket.io-client.

## Démarrage

Prérequis : Node.js 20.

```bash
npm ci
cp .env.example .env.local   # puis adapter les URL du backend
npm run dev                  # http://localhost:3000
```

Variables d'environnement (voir `src/constants/index.ts`) :

| Variable | Rôle | Défaut |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL HTTP du backend | `http://localhost:3001` |
| `NEXT_PUBLIC_WS_URL` | URL WebSocket (socket.io) du backend | `ws://localhost:3001` |
| `NEXT_PUBLIC_APP_URL` | URL publique du frontend, utilisée pour le QR code et le lien direct `/player/join?code=XXXXXX` (voir `src/lib/sessionCode.ts`) | origine du navigateur |

`NEXT_PUBLIC_APP_URL` est inlinée au build (comme toute variable `NEXT_PUBLIC_*`). Si les élèves n'atteignent pas l'application par la même adresse que le poste du prof (par exemple `localhost` chez le prof, IP du réseau local pour les élèves), renseignez-la avec l'adresse accessible par les élèves.

Ne jamais commiter `.env.local`.

## Rejoindre une session : QR code, lien direct, projection

- Le tableau de bord d'une session (`/creator/session/[id]`) affiche un QR code compact et un bouton **Mode projection**.
- Le QR code et le lien direct mènent à `/player/join?code=XXXXXX` : le code est pré-rempli (normalisé en majuscules, sans espaces) et le focus est placé sur le pseudo.
- **Mode projection** (`/creator/session/[id]/present`, ouvert dans un nouvel onglet) : écran plein écran pour le vidéoprojecteur, en lecture seule. Avant le jeu : code géant, QR code, compteur et nuage des pseudos en direct ; pendant le jeu : question en cours et minuteur, sans aucun contrôle (les commandes restent sur le tableau de bord).
- Composant réutilisable : `src/components/ui/JoinQrCode.tsx`.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint (`next/core-web-vitals`) |
| `npx tsc --noEmit` | Vérification des types |
| `npm test` | Tests unitaires et de composants (Vitest, une seule exécution) |
| `npm run test:watch` | Vitest en mode watch |
| `npm run test:e2e` | Tests end-to-end (Playwright) |

## Tests

### Unitaires et composants (Vitest + Testing Library)

- Configuration : `vitest.config.mts` (environnement `jsdom`, alias `@/` -> `src/`, comme dans `tsconfig.json`).
- Setup global : `src/test/setup.ts` (matchers `jest-dom`, nettoyage après chaque test, polyfill `matchMedia`).
- Les tests sont placés à côté du code, dans des dossiers `__tests__/` : `*.test.ts` / `*.test.tsx`.

### Simuler socket.io (`src/test/mockSocket.ts`)

`createMockSocket()` fournit un faux socket pour tester les composants « live » sans backend :

| Méthode | Rôle |
|---|---|
| `on` / `once` / `off` / `removeAllListeners` | Comme socket.io : enregistrent ou retirent des écouteurs |
| `emit(event, ...args)` | Émission côté client, mémorisée (aucun réseau) |
| `connect()` / `disconnect()` | Changent `connected` et déclenchent `connect` / `disconnect` |
| `serverEmit(event, ...args)` | **Simule un message du serveur** : appelle les écouteurs enregistrés |
| `emitted(event)` | Liste des arguments de chaque `emit` client pour cet événement |
| `emittedEvents` | Historique complet des émissions client |
| `listenerCount(event)` | Nombre d'écouteurs enregistrés (utile pour vérifier les nettoyages) |
| `asSocket()` | Cast vers le type `Socket` de socket.io-client |

Exemple (voir `src/hooks/__tests__/useSocket.test.tsx`) :

```tsx
import { act, cleanup, render, screen } from '@testing-library/react';
import { SocketProvider } from '@/hooks/useSocket';
import { disconnectSocket } from '@/lib/socket';
import { createMockSocket, type MockSocket } from '@/test/mockSocket';

let socket: MockSocket;
vi.mock('socket.io-client', () => ({ io: vi.fn(() => socket) }));

beforeEach(() => { socket = createMockSocket(); });
afterEach(() => { cleanup(); disconnectSocket(); }); // démonter d'abord ; @/lib/socket garde un singleton

it('affiche le classement reçu', () => {
  render(<SocketProvider><MonComposant /></SocketProvider>);
  act(() => socket.serverEmit('leaderboard:update', { leaderboard: [] }));
  expect(socket.emitted('session:join')).toHaveLength(1);
});
```

Pour un composant qui reçoit le socket par props ou via un contexte mocké, `createMockSocket({ connected: true }).asSocket()` suffit.

### End-to-end (Playwright)

- Configuration : `playwright.config.ts`, tests dans `e2e/`.
- Première fois : `npx playwright install chromium`.
- `npm run test:e2e` démarre `next dev` sur le port 3000 (ou réutilise un serveur déjà lancé). En CI, l'application est buildée puis servie avec `next start`.
- Variables utiles : `E2E_PORT` (port), `E2E_BASE_URL` (cible un serveur existant, sans en démarrer un).
- **Tests nécessitant le backend** : ajouter `@backend` dans le titre du test (`test('rejoindre une session @backend', ...)`). Ils sont ignorés sauf si `E2E_BACKEND=1`, car la CI n'a pas encore d'environnement backend de test.
- Les rapports (`test-results/`, `playwright-report/`) sont ignorés par git.

## Intégration continue

`.github/workflows/ci.yml` s'exécute sur chaque pull request et sur `main` (Node 20) :

1. **checks** : `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build` (avec des `NEXT_PUBLIC_*` factices) ;
2. **e2e** : `npm ci`, installation de Chromium, `npm run build`, `npm run test:e2e` (hors tests `@backend`). Le rapport Playwright est publié en artefact en cas d'échec ;
3. **docker** : construction de l'image (`Dockerfile`, sans push vers un registre), puis lancement du conteneur et vérification de `/`, `/api/health` et de l'état `healthy` du `HEALTHCHECK`.

Une PR n'est mergeable que si la CI est verte.

## Déploiement

Le frontend est déployé sur un VPS géré par **Coolify** à partir du `Dockerfile` (Next.js `output: 'standalone'`, `node server.js`, port 3000). Les variables `NEXT_PUBLIC_*` sont figées au build : elles se saisissent comme « build variables » dans Coolify. Procédure complète : [docs/deploiement-coolify.md](docs/deploiement-coolify.md).
