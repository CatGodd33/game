import crypto from "node:crypto";

export interface Rng {
  /** Número pseudoaleatorio en [0, 1). */
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
  chance(percent: number): boolean;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  shuffle<T>(items: readonly T[]): T[];
  normal(mean: number, standardDeviation: number): number;
}

function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let index = 0; index < seed.length; index += 1) {
    h = Math.imul(h ^ seed.charCodeAt(index), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const next = mulberry32(xmur3(seed)());

  const rng: Rng = {
    next,
    int(minInclusive, maxInclusive) {
      const min = Math.ceil(minInclusive);
      const max = Math.floor(maxInclusive);
      return Math.floor(next() * (max - min + 1)) + min;
    },
    chance(percent) {
      return next() * 100 < Math.max(0, Math.min(100, percent));
    },
    pick(items) {
      if (items.length === 0) throw new Error("No se puede elegir de una lista vacía.");
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    weighted(items, weight) {
      if (items.length === 0) throw new Error("No se puede elegir de una lista vacía.");
      const total = items.reduce((sum, item) => sum + Math.max(0, weight(item)), 0);
      if (total <= 0) return rng.pick(items);
      let cursor = next() * total;
      for (const item of items) {
        cursor -= Math.max(0, weight(item));
        if (cursor <= 0) return item;
      }
      return items[items.length - 1] as (typeof items)[number];
    },
    shuffle(items) {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1));
        const current = copy[index];
        copy[index] = copy[swap] as (typeof copy)[number];
        copy[swap] = current as (typeof copy)[number];
      }
      return copy;
    },
    normal(mean, standardDeviation) {
      const u = Math.max(next(), Number.EPSILON);
      const v = Math.max(next(), Number.EPSILON);
      const standardNormal = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return mean + standardNormal * standardDeviation;
    },
  };

  return rng;
}

/**
 * Deriva un flujo independiente a partir de la semilla maestra.
 * Etiquetas distintas garantizan que las tiradas del mundo y de cada jugador
 * no se consuman entre sí.
 */
export function deriveSeed(worldSeed: string, ...labels: (string | number)[]): string {
  return `${worldSeed}::${labels.join("::")}`;
}

export function createWorldSeed(): string {
  return crypto.randomBytes(18).toString("base64url");
}

export function seedFingerprint(worldSeed: string): string {
  return crypto.createHash("sha256").update(worldSeed).digest("hex").slice(0, 12);
}

/** Genera una tirada determinista en [0, 100) sin consumir estado del flujo. */
export function deterministicRoll(worldSeed: string, ...labels: (string | number)[]): number {
  return createRng(deriveSeed(worldSeed, ...labels)).next() * 100;
}
