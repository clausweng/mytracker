# syntax=docker/dockerfile:1.7

##
## Builds the Angular PWA (`apps/web`) and serves the static production
## bundle (including the service worker/manifest/icons) with nginx, which
## also reverse-proxies `/api/v1/*` to the `api` compose service.
##

FROM node:24-alpine AS deps
WORKDIR /app
# `apps/web` has no package.json of its own (it's a plain Nx project, not an
# npm workspace member) — only the root + api + shared-types package.json
# files are needed to reproduce the workspace's npm-ci install.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY libs/shared-types/package.json libs/shared-types/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npx nx build shared-types && npx nx build web --configuration=production

FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/apps/web/browser /usr/share/nginx/html
EXPOSE 80
