# Image de base Playwright officielle : Node 22 + Chromium + libs système
# pré-installés (~1.5 Go mais on évite 100+ apt-get pour les dépendances Chromium).
# On épingle une version pour éviter les surprises au prochain build.
FROM mcr.microsoft.com/playwright:v1.59.1-noble

WORKDIR /app

# Empêche Playwright de retélécharger les browsers (déjà dans l'image)
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY src/ ./src/

EXPOSE 3002

CMD ["node", "src/index.js"]
