# syntax=docker/dockerfile:1.25.0

FROM node:26.5.0-bookworm-slim AS deps

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN npm install --global pnpm@11.17.0

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/stream-canvas/package.json backend/stream-canvas/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:26.5.0-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN npm install --global pnpm@11.17.0

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_placeholder_CLERK_KEY
ARG NEXT_PUBLIC_CANVAS_API_URL=__NEXT_PUBLIC_CANVAS_API_URL__
ARG NEXT_PUBLIC_TLDRAW_LICENSE_KEY=tldraw-placeholder-key
ARG APP_RELEASE

ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CANVAS_API_URL=${NEXT_PUBLIC_CANVAS_API_URL}
ENV NEXT_PUBLIC_TLDRAW_LICENSE_KEY=${NEXT_PUBLIC_TLDRAW_LICENSE_KEY}
ENV PNPM_CONFIG_VERIFY_DEPS_BEFORE_RUN=false
ENV APP_RELEASE=${APP_RELEASE}

RUN test -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" || { \
    echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is empty; set the repository variable" >&2; \
    exit 1; \
    }
RUN pnpm exec sentry-cli --version
RUN pnpm run build
RUN --mount=type=secret,id=glitchtip_auth_token node scripts/upload-sourcemaps.mjs

FROM node:26.5.0-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ARG APP_RELEASE
ENV APP_RELEASE=${APP_RELEASE}

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
