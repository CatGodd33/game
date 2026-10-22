import { defineConfig } from "prisma/config";

const fallbackUrl =
  "postgresql://life_duel:life_duel@localhost:5432/life_duel?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? fallbackUrl,
  },
});
