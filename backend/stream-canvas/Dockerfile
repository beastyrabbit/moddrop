FROM oven/bun:1.3.11-alpine AS deps

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY src src

ENV NODE_ENV=production
ENV PORT=8003

EXPOSE 8003

VOLUME /app/data

CMD ["node", "--experimental-strip-types", "src/index.ts"]
