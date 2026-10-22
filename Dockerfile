FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.base.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm install
COPY shared shared
COPY server server
COPY client client
COPY data data
COPY prisma prisma
COPY scripts scripts
COPY prisma.config.ts ./
RUN npm run prisma:generate && npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json* ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
COPY --from=build /app/data data
COPY --from=build /app/prisma prisma
COPY --from=build /app/prisma.config.ts ./
COPY --from=build /app/scripts scripts
EXPOSE 4000
CMD ["node", "server/dist/index.js"]
