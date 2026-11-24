FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files for workspace
COPY package.json pnpm-workspace.yaml* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/

# Install dependencies (generates lockfile if missing)
RUN pnpm install --ignore-scripts

# Copy application code
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared
COPY packages/db ./packages/db
COPY packages/db/prisma ./packages/db/prisma

# Approve build scripts
RUN pnpm approve-builds @prisma/client @prisma/engines prisma esbuild sharp core-js-pure

# Install with scripts now approved
RUN pnpm install --offline

# Generate Prisma client
RUN pnpm --filter @content-intelligence/db exec prisma generate --schema=./prisma/schema.prisma

# Build shared packages
RUN pnpm --filter @content-intelligence/shared run build
RUN pnpm --filter @content-intelligence/db run build

WORKDIR /app/apps/frontend

EXPOSE 3000

CMD ["pnpm", "dev"]