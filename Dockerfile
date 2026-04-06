# syntax=docker/dockerfile:1.6

FROM oven/bun:1.3.11-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1.3.11-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG CONVEX_DEPLOYMENT
ARG NEXT_PUBLIC_CONVEX_URL=https://placeholder.convex.cloud
ARG NEXT_PUBLIC_CONVEX_SITE_URL=https://placeholder.convex.site
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_placeholder_CLERK_KEY
ARG NEXT_PUBLIC_CANVAS_API_URL=http://placeholder.canvas.local
ARG NEXT_PUBLIC_TLDRAW_LICENSE_KEY=tldraw-placeholder-key

ENV CONVEX_DEPLOYMENT=${CONVEX_DEPLOYMENT}
ENV NEXT_PUBLIC_CONVEX_URL=${NEXT_PUBLIC_CONVEX_URL}
ENV NEXT_PUBLIC_CONVEX_SITE_URL=${NEXT_PUBLIC_CONVEX_SITE_URL}
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
ENV NEXT_PUBLIC_CANVAS_API_URL=${NEXT_PUBLIC_CANVAS_API_URL}
ENV NEXT_PUBLIC_TLDRAW_LICENSE_KEY=${NEXT_PUBLIC_TLDRAW_LICENSE_KEY}

RUN bun run build

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chown=nextjs:nodejs --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
