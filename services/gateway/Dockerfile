FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install all deps (including devDeps) — TypeScript et @types sont nécessaires
# pour la compilation Next.js qui suit dans l'étape `builder`.
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Runtime image — uniquement les fichiers nécessaires pour démarrer.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
# public/ optionnel — créé vide si absent (favicon, images statiques).
RUN mkdir -p /app/public

EXPOSE 3000

CMD ["npm", "run", "start"]
