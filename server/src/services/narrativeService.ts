import type { NarrativeResponse } from "@life-duel/shared";
import { z } from "zod";
import { config } from "../config.js";
import { Errors } from "../errors.js";
import { logger } from "../logger.js";
import type { StoredGame, StoredPlayer } from "../types/records.js";
import type { GameService } from "./gameService.js";

const deepseekResponseSchema = z.object({
  text: z.string().min(20).max(2500),
});

const aiPayloadSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

function localNarrative(game: StoredGame, player: StoredPlayer): string {
  const result = game.final?.players[player.slot];
  const character = player.character;
  if (!result || !character) {
    return "Esta vida todavía no tiene un epílogo. La simulación debe terminar antes de escribir el final.";
  }
  const parts: string[] = [];
  parts.push(
    `${result.givenName} nació en ${result.birthCountry} y vivió ${result.ageAtDeath} años.`,
  );
  if (result.causeOfDeath) {
    parts.push(`Su vida terminó por ${result.causeOfDeath.toLowerCase()}.`);
  }
  if (result.milestoneTitles.length > 0) {
    parts.push(
      `Entre sus recuerdos quedan hitos como ${result.milestoneTitles
        .slice(0, 3)
        .join(", ")
        .toLowerCase()}.`,
    );
  }
  if (result.difficulties.length > 0) {
    parts.push(`También hubo sombras: ${result.difficulties[0].toLowerCase()}`);
  }
  parts.push(
    `Cierra su historia con ${Math.round(result.finalStats.health)} de salud, ${Math.round(
      result.finalStats.happiness,
    )} de felicidad y ${Math.round(result.score.total)} puntos de vida.`,
  );
  return parts.join(" ");
}

function buildPrompt(game: StoredGame, player: StoredPlayer): string {
  const result = game.final?.players[player.slot];
  const character = player.character;
  if (!result || !character) return "";
  return [
    "Escribe un epílogo narrativo breve (120-170 palabras) en español para un simulador de vidas.",
    "No inventes estadísticas nuevas ni cambies resultados. No menciones que eres una IA.",
    "Devuelve únicamente un objeto JSON con la clave 'text'.",
    `País de nacimiento: ${result.birthCountry}. Años vividos: ${result.ageAtDeath}.`,
    `Causa de muerte: ${result.causeOfDeath ?? "fin de la simulación"}.`,
    `Educación: ${result.education}. Ocupación: ${result.occupation ?? "trayectoria discontinua"}.`,
    `Salud final: ${Math.round(result.finalStats.health)}/100; Felicidad: ${Math.round(
      result.finalStats.happiness,
    )}/100; Relaciones: ${Math.round(result.finalStats.relationships)}/100.`,
    `Hitos: ${result.milestoneTitles.slice(0, 10).join("; ") || "ninguno registrado"}.`,
    `Dificultades: ${result.difficulties.join(" ") || "ninguna documentada"}.`,
    `Resumen local: ${result.lifeSummary}`,
  ].join("\n");
}

function extractText(content: string): string | null {
  const trimmed = content.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const validated = deepseekResponseSchema.safeParse(parsed);
    if (validated.success) return validated.data.text;
  } catch {
    // Algunos modelos devuelven texto plano pese a pedir JSON.
  }
  const validated = deepseekResponseSchema.safeParse({ text: trimmed });
  return validated.success ? validated.data.text : null;
}

/**
 * La IA es un extra narrativo, nunca una fuente de verdad del juego.
 * Sin clave de DeepSeek se devuelve un epílogo local determinista.
 */
export class NarrativeService {
  constructor(private readonly gameService: GameService) {}

  async generate(gameId: string, playerId: string): Promise<NarrativeResponse> {
    const game = await this.gameService.getGameRecordForMember(gameId, playerId);
    const player = game.players.find((candidate) => candidate.playerId === playerId);
    if (!player) throw Errors.forbidden("No participas en esta partida.");
    if (game.status !== "finished" || !game.final) {
      throw Errors.conflict("El epílogo solo está disponible cuando la partida ha terminado.");
    }
    if (player.aiNarrative && player.aiNarrativeSource === "deepseek") {
      return { text: player.aiNarrative, source: "deepseek" };
    }
    const fallback = localNarrative(game, player);
    if (!config.deepseek.enabled) {
      return {
        text: fallback,
        source: "local",
        notice: "DeepSeek no está configurado en el servidor. Se muestra un epílogo local.",
      };
    }

    try {
      const response = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.deepseek.apiKey}`,
        },
        signal: AbortSignal.timeout(config.deepseek.timeoutMs),
        body: JSON.stringify({
          model: config.deepseek.model,
          messages: [
            {
              role: "system",
              content:
                "Eres un narrador literario en español. Respetas estrictamente los datos proporcionados y no alteras la simulación.",
            },
            { role: "user", content: buildPrompt(game, player) },
          ],
          temperature: 0.8,
          max_tokens: 320,
          stream: false,
        }),
      });
      if (!response.ok) {
        throw new Error(`DeepSeek respondió ${response.status}`);
      }
      const payload = aiPayloadSchema.parse(await response.json());
      const content = payload.choices[0]?.message.content ?? "";
      const text = extractText(content);
      if (!text) throw new Error("Respuesta de DeepSeek sin texto válido.");
      await this.gameService.saveNarrative(gameId, player.slot, text, "deepseek");
      return { text, source: "deepseek" };
    } catch (error) {
      logger.warn("DeepSeek no disponible; se usa el epílogo local.", {
        error: error instanceof Error ? error.message : "desconocido",
      });
      return {
        text: fallback,
        source: "local",
        notice: "No se pudo generar el epílogo con DeepSeek. Se muestra el texto local.",
      };
    }
  }
}
