# ============================================================
# Cash Pro API — container image (Cloud Run / ECS / K8s ready)
# Build context = monorepo root:  docker build -f docker/api.Dockerfile .
# ============================================================
FROM node:20-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY packages/config/package.json packages/config/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @cash-pro/api...

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/config ./packages/config
COPY packages/core ./packages/core
COPY packages/db ./packages/db
COPY apps/api ./apps/api
EXPOSE 8080
ENV PORT=8080
# Run TypeScript directly via tsx so workspace source packages resolve
# without a separate bundling step.
CMD ["pnpm", "--filter", "@cash-pro/api", "exec", "tsx", "src/index.ts"]
