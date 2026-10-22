#!/usr/bin/env node
/**
 * Utilidad de desarrollo para completar el catálogo chino.
 *
 * Lee data/i18n/missing.json (generado por build-zh-catalog.mjs), traduce las
 * cadenas que faltan con el endpoint público de Google Translate y las añade a
 * data/i18n/zh.json. No se ejecuta en producción ni en el arranque del juego:
 * el resultado queda versionado y la aplicación funciona sin red.
 *
 * Uso: node scripts/translate-zh-missing.mjs [--limit 50]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const missing = read("data/i18n/missing.json");
const cache = read("data/i18n/zh.json");
const limitIndex = process.argv.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : Number.POSITIVE_INFINITY;

const isTranslatable = (value) => {
    if (!value || value.length > 600) return false;
    if (cache[value]) return false;
    if (/^[Mm]\s*-?\d/.test(value)) return false; // rutas SVG
    if (/^[A-Za-z]?\d[\d\s.,:%×+\-–—/()]*$/.test(value)) return false; // cifras
    if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(value) || !/[a-záéíóúüñ]/.test(value)) return false;
    if (/^[a-z-]+(?::[a-z0-9-]+)?$/.test(value)) return false; // tokens CSS
    if (/[{}<>]/.test(value)) return false;
    if (/^(https?:|data:|\/api\/)/.test(value)) return false;
    return true;
};

const pending = missing.filter(isTranslatable).slice(0, limit);
console.log(`Pendientes traducibles: ${pending.length} de ${missing.length}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translate(text, attempt = 0) {
    const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=es&tl=zh-CN&q=${encodeURIComponent(text)}`;
    try {
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 LIFE-DUEL-i18n-catalog/2.4" },
            signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const value = Array.isArray(data) ? data[0] : data?.sentences?.map((s) => s.trans || "").join("");
        if (typeof value !== "string" || !value.trim()) throw new Error("respuesta vacía");
        return value.trim();
    } catch (error) {
        if (attempt >= 3) {
            console.warn(`No traducido: ${text.slice(0, 70)} · ${error.message}`);
            return null;
        }
        await sleep(800 * (attempt + 1));
        return translate(text, attempt + 1);
    }
}

let done = 0;
const queue = [...pending];
const workers = Array.from({ length: 3 }, async () => {
    while (queue.length) {
        const text = queue.shift();
        const value = await translate(text);
        if (value) {
            cache[text] = value;
            done += 1;
        }
        await sleep(140);
        if (done % 25 === 0 && done > 0) console.log(`  ${done}/${pending.length}`);
    }
});
await Promise.all(workers);

const sorted = Object.fromEntries(Object.keys(cache).sort((a, b) => a.localeCompare(b, "es")).map((key) => [key, cache[key]]));
fs.writeFileSync(path.join(root, "data/i18n/zh.json"), JSON.stringify(sorted, null, 1) + "\n");
console.log(`Añadidas ${done} traducciones; catálogo automático: ${Object.keys(sorted).length}.`);
