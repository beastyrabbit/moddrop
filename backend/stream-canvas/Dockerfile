FROM node:26.5.0-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN npm install --global pnpm@11.17.0

FROM base AS build

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/stream-canvas/package.json backend/stream-canvas/package.json
RUN pnpm install --filter stream-canvas --frozen-lockfile --ignore-scripts

COPY backend/stream-canvas/tsconfig.json backend/stream-canvas/tsconfig.json
COPY backend/stream-canvas/src backend/stream-canvas/src
COPY backend/stream-canvas/drizzle backend/stream-canvas/drizzle
RUN pnpm --dir backend/stream-canvas run build

FROM base AS production-dependencies

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/stream-canvas/package.json backend/stream-canvas/package.json
RUN pnpm install --filter stream-canvas --prod --frozen-lockfile --ignore-scripts

FROM node:26.5.0-bookworm-slim AS runner

WORKDIR /app/backend/stream-canvas

ENV NODE_ENV=production
ENV PORT=8003

COPY --from=production-dependencies /app/node_modules /app/node_modules
COPY --from=production-dependencies /app/backend/stream-canvas/node_modules ./node_modules
COPY --from=build /app/backend/stream-canvas/dist ./dist
COPY --from=build /app/backend/stream-canvas/drizzle ./drizzle
COPY backend/stream-canvas/package.json ./package.json

USER node

EXPOSE 8003

CMD ["node", "dist/index.js"]
