FROM node:20-alpine AS base
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @taskmate/shared build
RUN pnpm --filter @taskmate/ui build
RUN pnpm --filter @taskmate/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@taskmate/web", "start"]
