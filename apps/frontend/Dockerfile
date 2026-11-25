FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files for workspace
COPY package.json pnpm-workspace.yaml* ./
COPY apps/frontend/package.json ./apps/frontend/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies (generates lockfile if missing)
RUN pnpm install --ignore-scripts

# Copy application code
COPY apps/frontend ./apps/frontend
COPY packages/shared ./packages/shared

# Approve build scripts
RUN pnpm approve-builds esbuild sharp core-js-pure

# Install with scripts now approved
RUN pnpm install --offline

# Build shared package
RUN pnpm --filter @content-intelligence/shared run build

WORKDIR /app/apps/frontend

EXPOSE 3000

CMD ["pnpm", "dev"]