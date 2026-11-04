# Build from the repo root:  docker build -f apps/api/Dockerfile -t roastcost-api .
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @roastcost/api... --ignore-scripts=false
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @roastcost/api build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production MIGRATIONS_DIR=/app/migrations LEGAL_DIR=/app/legal
WORKDIR /app
# only the native module is installed; everything else is bundled into dist/
RUN npm install --omit=dev --no-audit --no-fund @node-rs/argon2@2 && npm cache clean --force
COPY --from=build /repo/apps/api/dist ./dist
COPY apps/api/migrations ./migrations
COPY legal ./legal
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/healthz || exit 1
CMD ["node", "--enable-source-maps", "dist/server.js"]
