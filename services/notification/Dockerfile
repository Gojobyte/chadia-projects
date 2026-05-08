FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY src/ ./src/

EXPOSE 3003

CMD ["node", "src/index.js"]
