FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY scripts/worker.ts scripts/
COPY src/lib/queue ./src/lib/queue
COPY src/lib/observability/logger.ts ./src/lib/observability/logger.ts

ENV NODE_ENV=production
CMD ["npx", "tsx", "scripts/worker.ts"]
