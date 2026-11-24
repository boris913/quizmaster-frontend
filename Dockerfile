# syntax=docker/dockerfile:1
# Image de production Kwizora (Next.js standalone), déployée par Coolify.
# Voir docs/deploiement-coolify.md.

ARG NODE_VERSION=20

# --- 1. Dépendances -----------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
# libc6-compat : binaire SWC de Next.js sous Alpine (musl).
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# --- 2. Build -----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Les NEXT_PUBLIC_* sont inlinées dans le JS client au moment du build :
# elles doivent être fournies ici (« build variables » dans Coolify).
# Changer leur valeur impose de reconstruire l'image.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL} \
    NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next/font/google télécharge Bricolage Grotesque et Instrument Sans pendant le build
# (accès réseau à fonts.googleapis.com / fonts.gstatic.com requis) ; elles sont ensuite
# servies depuis /_next/static, sans appel à Google à l'exécution.
RUN npm run build

# --- 3. Exécution -------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Utilisateur non-root (uid/gid fixes).
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Sonde légère : /api/health répond 200 sans dépendre du backend.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
