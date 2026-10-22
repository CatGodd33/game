import type { GameView } from "@life-duel/shared";
import { formatScore } from "@life-duel/shared";

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

export async function createResultCard(game: GameView): Promise<Blob> {
  if (!game.final) throw new Error("La partida aún no tiene un resultado final.");
  const scale = 2;
  const width = 1200;
  const height = 630;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite generar la tarjeta.");
  ctx.scale(scale, scale);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#060912");
  gradient.addColorStop(0.55, "#0d1628");
  gradient.addColorStop(1, "#11182c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const glow = ctx.createRadialGradient(1000, 80, 10, 1000, 80, 500);
  glow.addColorStop(0, "rgba(216,184,117,0.22)");
  glow.addColorStop(1, "rgba(216,184,117,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  const jadeGlow = ctx.createRadialGradient(190, 580, 10, 190, 580, 380);
  jadeGlow.addColorStop(0, "rgba(84,217,140,0.12)");
  jadeGlow.addColorStop(1, "rgba(84,217,140,0)");
  ctx.fillStyle = jadeGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(216,184,117,0.35)";
  ctx.lineWidth = 1;
  roundedRect(ctx, 24, 24, width - 48, height - 48, 28);
  ctx.stroke();

  ctx.fillStyle = "#d8b875";
  ctx.font = "600 14px Inter, Arial, sans-serif";
  ctx.letterSpacing = "3px";
  ctx.fillText("LIFE DUEL", 60, 74);
  ctx.letterSpacing = "0px";

  ctx.fillStyle = "rgba(244,240,230,0.55)";
  ctx.font = "13px Inter, Arial, sans-serif";
  ctx.fillText("DOS VIDAS · UN MISMO MUNDO · UNA SOLA OPORTUNIDAD", 60, 98);

  const result = game.final;
  const winnerLabel =
    result.winner === "tie"
      ? "EMPATE"
      : result.winner
        ? `GANA ${result.players[result.winner]?.alias ?? `JUGADOR ${result.winner}`}`.toUpperCase()
        : "VIDA COMPLETADA";
  ctx.fillStyle = "#f4f0e6";
  ctx.font = "600 46px Georgia, serif";
  ctx.fillText(winnerLabel, 60, 164);
  ctx.fillStyle = "rgba(201,196,184,0.75)";
  ctx.font = "15px Inter, Arial, sans-serif";
  ctx.fillText(
    truncate(ctx, `${game.world.birth.givenName} · ${game.world.birth.countryName} · ${game.world.birth.year}`, 1000),
    60,
    194,
  );

  const players = [result.players[1], result.players[2]].filter(Boolean);
  const cardWidth = players.length > 1 ? 522 : 1080;
  players.forEach((player, index) => {
    if (!player) return;
    const x = 60 + index * (cardWidth + 36);
    const y = 226;
    const cw = cardWidth;
    const ch = 278;
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    roundedRect(ctx, x, y, cw, ch, 22);
    ctx.fill();
    ctx.strokeStyle = index === 0 ? "rgba(216,184,117,0.3)" : "rgba(84,217,140,0.3)";
    ctx.stroke();

    ctx.fillStyle = index === 0 ? "#ecd7a4" : "#9be9bb";
    ctx.font = "600 12px Inter, Arial, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(`JUGADOR ${player.slot}`, x + 28, y + 38);
    ctx.letterSpacing = "0px";

    ctx.fillStyle = "#f4f0e6";
    ctx.font = "600 30px Georgia, serif";
    ctx.fillText(truncate(ctx, player.alias, cw - 200), x + 28, y + 78);

    ctx.fillStyle = index === 0 ? "#d8b875" : "#54d98c";
    ctx.font = "600 42px Georgia, serif";
    ctx.textAlign = "right";
    ctx.fillText(formatScore(player.score.total), x + cw - 28, y + 78);
    ctx.font = "11px Inter, Arial, sans-serif";
    ctx.fillStyle = "rgba(244,240,230,0.5)";
    ctx.fillText("PUNTOS", x + cw - 28, y + 96);
    ctx.textAlign = "left";

    ctx.fillStyle = "rgba(244,240,230,0.68)";
    ctx.font = "13px Inter, Arial, sans-serif";
    ctx.fillText(
      truncate(
        ctx,
        `${player.ageAtDeath} años · ${player.causeOfDeath ?? "causa no determinada"}`,
        cw - 56,
      ),
      x + 28,
      y + 116,
    );

    const stats = [
      ["Salud", player.finalStats.health],
      ["Felicidad", player.finalStats.happiness],
      ["Conocimiento", player.finalStats.knowledge],
      ["Relaciones", player.finalStats.relationships],
    ] as const;
    stats.forEach(([label, value], statIndex) => {
      const cellX = x + 28 + (statIndex % 2) * ((cw - 56) / 2);
      const cellY = y + 154 + Math.floor(statIndex / 2) * 44;
      ctx.fillStyle = "rgba(244,240,230,0.45)";
      ctx.font = "11px Inter, Arial, sans-serif";
      ctx.fillText(label, cellX, cellY);
      ctx.fillStyle = "#f4f0e6";
      ctx.font = "600 17px Inter, Arial, sans-serif";
      ctx.fillText(`${Math.round(value)}/100`, cellX, cellY + 18);
    });

    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(x + 28, y + 238, cw - 56, 1);
    ctx.fillStyle = "rgba(244,240,230,0.55)";
    ctx.font = "12px Inter, Arial, sans-serif";
    ctx.fillText(
      truncate(ctx, `${player.milestoneTitles.length} hitos · ${player.children} hijos · ${player.countriesLived.length} países`, cw - 56),
      x + 28,
      y + 262,
    );
  });

  ctx.fillStyle = "rgba(244,240,230,0.38)";
  ctx.font = "12px Inter, Arial, sans-serif";
  ctx.fillText(
    `Semilla pública ${game.world.seedFingerprint.toUpperCase().slice(0, 12)} · Reglas de puntuación visibles · life-duel`,
    60,
    566,
  );
  ctx.fillStyle = "rgba(216,184,117,0.65)";
  ctx.font = "600 12px Inter, Arial, sans-serif";
  ctx.fillText(`MARGEN ${result.margin.toFixed(1)} PTS`, 60, 588);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No se pudo crear la imagen de la tarjeta."));
    }, "image/png");
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
