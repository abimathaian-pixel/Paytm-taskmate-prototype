FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @taskmate/shared build
RUN pnpm --filter @taskmate/db build
RUN pnpm --filter @taskmate/tools build
RUN pnpm --filter @taskmate/agent build
RUN pnpm --filter @taskmate/api build

EXPOSE 4000
CMD ["pnpm", "--filter", "@taskmate/api", "dev"]
