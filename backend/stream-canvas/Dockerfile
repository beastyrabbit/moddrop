FROM node:22-alpine AS deps

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable
RUN apk add --no-cache python3 make g++

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/stream-canvas/package.json backend/stream-canvas/package.json
RUN pnpm install --filter stream-canvas --frozen-lockfile --prod --ignore-scripts \
  && pnpm --dir backend/stream-canvas exec npm rebuild better-sqlite3

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/stream-canvas/node_modules ./backend/stream-canvas/node_modules
COPY backend/stream-canvas/package.json backend/stream-canvas/package.json
COPY backend/stream-canvas/tsconfig.json backend/stream-canvas/tsconfig.json
COPY backend/stream-canvas/src backend/stream-canvas/src

WORKDIR /app/backend/stream-canvas

ENV NODE_ENV=production
ENV PORT=8003

EXPOSE 8003

VOLUME /app/data

CMD ["node", "--experimental-strip-types", "src/index.ts"]
