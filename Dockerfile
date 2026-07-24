# syntax=docker/dockerfile:1.6

FROM node:26.5.0-bookworm-slim AS deps

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN npm install --global pnpm@11.15.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/stream-canvas/package.json backend/stream-canvas/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM node:26.5.0-bookworm-slim AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN npm install --global pnpm@11.15.1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG CONVEX_DEPLOYMENT
ARG NEXT_PUBLIC_CONVEX_URL=https://placeholder.convex.cloud
ARG NEXT_PUBLIC_CONVEX_SITE_URL=https://placeholder.convex.site
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_placeholder_CLERK_KEY
ARG NEXT_PUBLIC_CANVAS_API_URL=__NEXT_PUBLIC_CANVAS_API_URL__
ARG NEXT_PUBLIC_TLDRAW_LICENSE_KEY=tldraw-placeholder-key

ENV CONVEX_DEPLOYMENT=${CONVEX_DEPLOYMENT}
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CANVAS_API_URL=${NEXT_PUBLIC_CANVAS_API_URL}
ENV NEXT_PUBLIC_TLDRAW_LICENSE_KEY=${NEXT_PUBLIC_TLDRAW_LICENSE_KEY}

RUN pnpm --verify-deps-before-run=false run build

FROM node:26.5.0-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --chown=node:node --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

USER node

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
