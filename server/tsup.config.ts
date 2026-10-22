import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node20",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  dts: false,
  // El paquete compartido se compila dentro del servidor; las dependencias
  // nativas/dinámicas (Prisma y pg) se resuelven desde node_modules.
  noExternal: ["@life-duel/shared"],
  external: ["@prisma/client", "@prisma/adapter-pg", "pg"],
});
