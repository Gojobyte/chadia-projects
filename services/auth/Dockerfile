FROM node:22-alpine

WORKDIR /app

# Install dependencies (npm install — lockfile manquant pour npm ci)
COPY package*.json ./
RUN npm install --omit=dev

# Copy prisma and generate client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source
COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
