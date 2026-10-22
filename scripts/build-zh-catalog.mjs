#!/usr/bin/env node
/**
 * Genera shared/src/i18n/zh.ts a partir de:
 *  - data/i18n/spanish-strings.json  (extraído con scripts/extract-i18n.mjs)
 *  - data/i18n/zh.json               (traducciones automáticas, cacheadas)
 *  - data/i18n/zh-overrides.json     (términos de interfaz revisados a mano)
 *
 * No llama a ningún servicio externo: la traducción se hizo una vez y queda
 * versionada. Así el juego funciona sin red y sin API key, y una revisión del
 * catálogo es reproducible. Para añadir cadenas nuevas: ejecutar la extracción,
 * traducir las que falten en zh.json y volver a ejecutar este script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const strings = read("data/i18n/spanish-strings.json");
const machine = read("data/i18n/zh.json");
const overrides = read("data/i18n/zh-overrides.json");
const templates = read("data/i18n/zh-templates.json");

const tokenKey = (value) =>
    value
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\d+(?:[.,]\d+)*/g, "{{n}}")
        .replace(/\s+/g, " ");

const tokenCatalog = {
    "Edad {{n}}": "年龄 {{n}}",
    "{{n}} años": "{{n}} 岁",
    "Edad {{n}} años": "{{n}} 岁",
    "Velocidad {{n}}×": "速度 {{n}}×",
    "Año {{n}}": "{{n}} 年",
    "{{n}} %": "{{n}}%",
    "{{n}} hijos": "{{n}} 个孩子",
    "{{n}} meses": "{{n}} 个月",
    "{{n}} días": "{{n}} 天",
    "{{n}} años de vida": "{{n}} 年人生",
    "Ingresos {{n}} US$/año": "年收入 {{n}} US$",
    "Gastos {{n}} US$/año": "年支出 {{n}} US$",
    "{{n}} US$/año": "{{n}} US$/年",
    "{{n}} US$/mes": "{{n}} US$/月",
    "VERSIÓN {{n}}": "版本 {{n}}",
};

const catalog = {};
const missing = [];
for (const source of strings) {
    if (Object.prototype.hasOwnProperty.call(overrides, source)) continue;
    // Las cantidades se resuelven con plantillas ({{n}} años → {{n}} 岁);
    // una traducción fija de "0 años" no debe imponerse a las demás edades.
    if (/^\d+\s*(?:años?|meses|hijos|hijas|días|semanas|recientes)$/.test(source)) continue;
    const target = machine[source];
    if (!target || target === source) {
        missing.push(source);
        continue;
    }
    catalog[source] = target;
}

const MONTHS = [
    ["enero", "1"], ["febrero", "2"], ["marzo", "3"], ["abril", "4"],
    ["mayo", "5"], ["junio", "6"], ["julio", "7"], ["agosto", "8"],
    ["septiembre", "9"], ["octubre", "10"], ["noviembre", "11"], ["diciembre", "12"],
];
const SHORT_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
for (const [name, number] of MONTHS) {
    tokenCatalog[`${name} de {{n}}`] = `{{n}}年${number}月`;
    tokenCatalog[`${name[0].toUpperCase()}${name.slice(1)} De {{n}}`] = `{{n}}年${number}月`;
}
SHORT_MONTHS.forEach((name, index) => {
    tokenCatalog[`${name} {{n}}`] = `{{n}}年${index + 1}月`;
    tokenCatalog[`${name[0].toUpperCase()}${name.slice(1)} {{n}}`] = `{{n}}年${index + 1}月`;
});
tokenCatalog["{{n}}/{{n}} recientes"] = "最近 {{n}}/{{n}} 笔";
tokenCatalog["{{n}} de {{n}}"] = "{{n}}/{{n}}";

for (const [source, target] of [...Object.entries(catalog), ...Object.entries(overrides)]) {
    if (!/\d/.test(source) || !/\d/.test(target)) continue;
    const key = tokenKey(source);
    const value = tokenKey(target);
    if (key !== source && key.split("{{n}}").length === value.split("{{n}}").length) {
        if (!(key in tokenCatalog)) tokenCatalog[key] = value;
    }
}

const sortObject = (value) =>
    Object.fromEntries(Object.keys(value).sort((a, b) => a.localeCompare(b, "es")).map((key) => [key, value[key]]));

const sortedCatalog = sortObject(catalog);
const sortedOverrides = sortObject(overrides);
const sortedTokens = sortObject(tokenCatalog);
const sortedTemplates = sortObject(templates);
const emit = (name, value) => {
    const lines = Object.entries(value).map(
        ([source, target]) => `    ${JSON.stringify(source)}: ${JSON.stringify(target)},`,
    );
    return `export const ${name}: Record<string, string> = {\n${lines.join("\n")}\n};\n`;
};

const output = [
    "// Catálogo generado por scripts/build-zh-catalog.mjs. No editar a mano.",
    "// Fuente: cadenas de la interfaz y del catálogo del motor, traducidas una sola vez.",
    "// El motor no usa estas cadenas: solo la capa de presentación (cliente y borde HTTP).",
    "",
    emit("ZH_CATALOG", sortedCatalog),
    emit("ZH_OVERRIDES", sortedOverrides),
    emit("ZH_TOKEN_CATALOG", sortedTokens),
    emit("ZH_TEMPLATES", sortedTemplates),
    `export const ZH_COVERAGE = ${JSON.stringify(
        {
            machine: Object.keys(sortedCatalog).length,
            overrides: Object.keys(sortedOverrides).length,
            tokens: Object.keys(sortedTokens).length,
            templates: Object.keys(sortedTemplates).length,
            missing: missing.length,
        },
        null,
        4,
    )};\n`,
    "",
].join("\n");

const target = path.join(root, "shared/src/i18n/zh.ts");
fs.writeFileSync(target, output);
fs.writeFileSync(path.join(root, "data/i18n/missing.json"), JSON.stringify(missing, null, 1) + "\n");
console.log(
    `zh.ts: ${Object.keys(sortedCatalog).length} automáticas, ${Object.keys(sortedOverrides).length} revisadas, ` +
    `${Object.keys(sortedTokens).length} numéricas, ${Object.keys(sortedTemplates).length} narrativas, ` +
    `${missing.length} sin traducir · ${(fs.statSync(target).size / 1024).toFixed(1)} kB`,
);
