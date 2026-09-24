FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @taskmate/shared build
RUN pnpm --filter @taskmate/db build
RUN pnpm --filter @taskmate/tools build
RUN pnpm --filter @taskmate/agent build
RUN pnpm --filter @taskmate/worker build

EXPOSE 4001
CMD ["pnpm", "--filter", "@taskmate/worker", "dev"]
