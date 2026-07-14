# syntax=docker/dockerfile:1

# ---- Build stage: compile the static site with pnpm ----
FROM node:24-alpine AS build
WORKDIR /app

# Enable pnpm via corepack, pinned to the version used by the lockfile.
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

# Install dependencies first so this layer is cached unless the
# manifest or lockfile changes.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Type-check and build the production bundle into /app/dist.
COPY . .
RUN pnpm build

# ---- Runtime stage: serve the static bundle with nginx ----
FROM nginx:1.27-alpine AS runtime

# SPA-aware config (history fallback, gzip, long-cache for hashed assets).
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ship only the built output.
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
