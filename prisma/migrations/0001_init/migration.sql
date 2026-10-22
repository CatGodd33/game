-- Migración inicial de LIFE DUEL para PostgreSQL.
-- El snapshot completo del motor vive en `data`; las columnas permiten
-- localizar salas por código y filtrar por estado.

CREATE TABLE "GameRecord" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "code" TEXT,
    "status" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameRecord_code_key" ON "GameRecord"("code");
CREATE INDEX "GameRecord_status_idx" ON "GameRecord"("status");
CREATE INDEX "GameRecord_mode_idx" ON "GameRecord"("mode");
