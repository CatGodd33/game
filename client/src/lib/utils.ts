import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededNumber(seed: string, index: number, min: number, max: number): number {
  const value = hashString(`${seed}:${index}`);
  return min + (value % 1000) / 1000 * (max - min);
}

export function seededPick<T>(seed: string, index: number, items: readonly T[]): T {
  if (items.length === 0) throw new Error("Lista vacía");
  return items[hashString(`${seed}:${index}`) % items.length] as T;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Ha ocurrido un error inesperado.";
}
