# syntax=docker/dockerfile:1.7

##
## Builds the NestJS API (`apps/api`) from the Nx monorepo.
##
## Stages:
##   deps    – installs the full npm workspace (root + api + shared-types).
##   build   – builds `shared-types` then `api` (production, webpack bundle).
##   migrate – image used by the one-off `migrate` compose service; keeps the
##             dev dependencies (drizzle-kit, tsx) and TS source needed to run
##             `drizzle-kit migrate` + the exercise catalogue seed script.
##   runtime – slim image: only the built bundle + production node_modules.
##

FROM node:24-alpine AS deps
WORKDIR /app
# Only the package.json files that make up the npm workspace are needed for
# `npm ci` to resolve the lockfile — copying just these keeps this layer
# cached until a dependency actually changes.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY libs/shared-types/package.json libs/shared-types/package.json
RUN npm ci

FROM deps AS build
COPY . .
RUN npx nx build shared-types && npx nx build api --configuration=production

FROM build AS migrate
WORKDIR /app/apps/api
ENTRYPOINT ["sh", "-c"]
CMD ["npx drizzle-kit migrate && node --import tsx src/app/database/seed.ts"]

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# `apps/api` is bundled by webpack with node_modules externalized (see
# apps/api/webpack.config.js), so the runtime image still needs node_modules —
# copy the workspace-hoisted tree from the deps/build stage rather than
# reinstalling in this stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs/shared-types/package.json ./libs/shared-types/package.json
COPY --from=build /app/libs/shared-types/dist ./libs/shared-types/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
