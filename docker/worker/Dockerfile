FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY tsconfig.json ./
RUN npx prisma generate

COPY scripts/worker.ts scripts/
COPY src/lib ./src/lib

ENV NODE_ENV=production
CMD ["npx", "tsx", "scripts/worker.ts"]
