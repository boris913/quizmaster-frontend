# Déploiement du frontend sur Coolify (VPS)

Le frontend Kwizora est livré sous forme d'image Docker (Next.js en mode `standalone`) construite et
servie par **Coolify 4** sur un VPS. Traefik, intégré à Coolify, termine le HTTPS (certificats
Let's Encrypt automatiques).

| Élément | Valeur |
|---|---|
| Domaine public | `https://kwizora.com` (et `https://www.kwizora.com` redirigé vers lui) |
| API REST | `https://api.kwizora.com` (préfixe `/api` ajouté par le frontend) |
| Socket.io | même domaine que l'API, transport WebSocket uniquement |
| Port interne du conteneur | `3000` |
| Sonde de santé | `GET /api/health` -> `200 {"status":"ok"}` |

Le frontend n'appelle pas Supabase directement : les images de questions arrivent sous forme d'URL
signées fournies par l'API et sont affichées avec un `<img>` natif. Aucune variable Supabase n'est donc
nécessaire côté frontend.

## Fichiers concernés

- `next.config.js` : `output: 'standalone'`.
- `Dockerfile` : build multi-étapes Node 20 Alpine (`deps` -> `builder` -> `runner`), utilisateur
  non-root `nextjs` (uid 1001), `node server.js`, `HOSTNAME=0.0.0.0`, `PORT=3000`, `HEALTHCHECK` sur
  `/api/health`.
- `.dockerignore` : exclut `.env*`, `node_modules`, `.next`, `.git` et les résultats Playwright.
- `src/app/api/health/route.ts` : sonde de santé, indépendante du backend.
- `.github/workflows/ci.yml`, job `docker` : construit l'image (sans push), lance le conteneur et
  vérifie `/`, `/api/health` et l'état `healthy`.

## 1. Créer l'application dans Coolify

1. **Projects** -> choisir le projet et l'environnement (par exemple `production`) -> **+ New** ->
   **Public Repository** (le dépôt est public), ou **Private Repository (with GitHub App)** si vous
   voulez les déploiements automatiques sur push via l'application GitHub de Coolify.
2. URL du dépôt : `https://github.com/boris913/quizmaster-frontend`, branche `main`.
3. **Build Pack** : `Dockerfile` (emplacement : `/Dockerfile`, contexte : `/`).
4. **Ports Exposes** : `3000`. Laisser **Ports Mappings** vide : Traefik route le trafic vers le
   conteneur, il n'est pas nécessaire de publier le port sur l'hôte.

## 2. Domaine et redirection www

1. Dans **Configuration -> General -> Domains**, saisir :
   `https://kwizora.com,https://www.kwizora.com`
   Coolify génère les routes Traefik et demande les certificats pour les deux noms.
2. **Direction** (redirection) : choisir **Redirect to non-www** pour que `www.kwizora.com` réponde par
   une redirection permanente vers `https://kwizora.com`.
3. DNS chez le registrar : enregistrements `A` (et `AAAA` si IPv6) pour `kwizora.com` et
   `www.kwizora.com` pointant vers l'adresse du VPS. Ne jamais écrire cette adresse dans le dépôt.
   Les certificats ne sont délivrés qu'une fois le DNS propagé.

## 3. Variables : build ou runtime

Next.js **inline les variables `NEXT_PUBLIC_*` dans le JavaScript client au moment du build**. Les
modifier dans Coolify n'a d'effet qu'après un **nouveau build** (bouton *Redeploy*, pas simple
*Restart*). Le `Dockerfile` les déclare en `ARG` + `ENV` dans l'étape `builder`.

Dans **Environment Variables**, cocher **Is Build Variable?** pour chacune :

| Variable | Valeur de production | Type | Rôle |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.kwizora.com` | build | URL de l'API REST (sans `/api` final : le frontend l'ajoute) |
| `NEXT_PUBLIC_WS_URL` | `wss://api.kwizora.com` | build | URL Socket.io (`https://api.kwizora.com` fonctionne aussi) |
| `NEXT_PUBLIC_APP_URL` | `https://kwizora.com` | build | URL publique du frontend, utilisée dans le QR code et le lien `/player/join?code=...` |

Variables d'exécution : aucune n'est à saisir. L'image fixe déjà `NODE_ENV=production`,
`NEXT_TELEMETRY_DISABLED=1`, `HOSTNAME=0.0.0.0` et `PORT=3000` ; ne pas les surcharger (si `PORT`
change, adapter aussi **Ports Exposes**).

Il n'existe aucun secret côté frontend : tout ce qui est `NEXT_PUBLIC_*` est public par nature et
visible dans le navigateur. Ne jamais y placer de clé privée.

Côté API, penser à autoriser l'origine `https://kwizora.com` dans la configuration CORS et Socket.io
du backend.

## 4. Build : accès réseau et polices

`next/font/google` (Bricolage Grotesque, Instrument Sans) **télécharge les polices pendant
`npm run build`** : le serveur qui construit l'image doit pouvoir joindre `fonts.googleapis.com` et
`fonts.gstatic.com` (ainsi que le registre npm pour `npm ci`). Une fois construites, les polices sont
servies depuis `/_next/static/media` : le navigateur des utilisateurs ne contacte jamais Google.
Si le build échoue sur une erreur de récupération de police, vérifier la sortie réseau du VPS (pare-feu,
DNS), puis relancer.

## 5. Sonde de santé

- Le `Dockerfile` déclare un `HEALTHCHECK` (`node` + `fetch` sur `http://127.0.0.1:3000/api/health`,
  toutes les 30 s, délai de démarrage 20 s). Coolify l'utilise tel quel.
- Si vous préférez la configurer dans Coolify (**Configuration -> Health Checks**) : chemin
  `/api/health`, port `3000`, code attendu `200`, méthode `GET`.

## 6. Vérifications après déploiement (smoke checks)

```bash
# Sonde de santé : 200 et {"status":"ok"}
curl -fsS https://kwizora.com/api/health

# Page d'accueil : 200
curl -fsS -o /dev/null -w '%{http_code}\n' https://kwizora.com/

# Redirection www -> apex : 301 ou 308 avec Location: https://kwizora.com/
curl -sSI https://www.kwizora.com/ | grep -iE '^(HTTP|location)'

# HTTP -> HTTPS
curl -sSI http://kwizora.com/ | grep -iE '^(HTTP|location)'
```

Puis, dans un navigateur :

1. Ouvrir `https://kwizora.com`, vérifier le certificat et le changement de langue FR/EN (cookie).
2. Se connecter : les appels partent vers `https://api.kwizora.com/api/...` (onglet Réseau), sans
   erreur CORS.
3. Lancer une session : la connexion WebSocket vers `wss://api.kwizora.com` passe en `101 Switching
   Protocols` ; un joueur rejoint via le QR code, qui pointe vers `https://kwizora.com/player/join?code=...`.

## 7. Tester l'image en local

```bash
docker build -t kwizora-frontend:local \
  --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001 \
  --build-arg NEXT_PUBLIC_WS_URL=ws://localhost:3001 \
  --build-arg NEXT_PUBLIC_APP_URL=http://localhost:3000 \
  .
docker run --rm -p 3000:3000 --name kwizora-local kwizora-frontend:local
curl -fsS http://localhost:3000/api/health
```

## 8. Mise à jour et retour arrière

- Chaque push sur `main` peut déclencher un déploiement automatique (option **Auto Deploy** avec
  l'application GitHub) ; sinon, bouton **Deploy**.
- Retour arrière : **Deployments** -> choisir un déploiement précédent -> **Redeploy**.
