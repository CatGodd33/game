import { describe, expect, it } from "vitest";
import {
    DEFAULT_LOCALE,
    hasTranslation,
    localizeDatePhrases,
    localizeDeep,
    translateText,
    zhCatalogSize,
} from "@life-duel/shared";

describe("capa de localización china", () => {
    it("traduce etiquetas, cantidades y fechas", () => {
        expect(translateText("Salud", "zh")).toBe("健康");
        expect(translateText("Felicidad", "zh")).toBe("幸福");
        expect(translateText("0 años", "zh")).toBe("0 岁");
        expect(translateText("Conocimiento +2", "zh")).toBe("知识 +2");
        expect(localizeDatePhrases("enero de 2026")).toBe("2026年1月");
        expect(localizeDatePhrases("17 de enero de 2026")).toBe("2026年1月17日");
        expect(localizeDatePhrases("Ene 2026")).toBe("2026年1月");
    });

    it("mantiene el español intacto y no inventa traducciones", () => {
        expect(DEFAULT_LOCALE).toBe("es");
        expect(translateText("Salud", "es")).toBe("Salud");
        expect(translateText("Nombre propio sin catálogo", "zh")).toBe("Nombre propio sin catálogo");
        expect(translateText("", "zh")).toBe("");
    });

    it("resuelve plantillas narrativas con nombres, lugares y cifras", () => {
        const birth = translateText(
            "Ana Pérez nació en Madrid, España, en una familia obrera. La casa es pequeña y el mes se organiza con lo justo. Aun así, hay normas, afecto y una red de vecinos que se ayudan. La familia vive en Madrid, España. Uno de tus cuidadores alcanzó educación secundaria.",
            "zh",
        );
        expect(birth).toContain("Ana Pérez");
        expect(birth).toContain("出生于马德里");
        expect(birth).toContain("工人");
        expect(birth).toContain("家庭住在马德里");
        expect(birth).toContain("中等教育");
        expect(birth).not.toContain("La familia vive");

        const title = translateText("Nacer en España", "zh");
        expect(title).toBe("出生于西班牙");

        const monthly = translateText("Tuviste fiebre de madrugada en Barcelona.", "zh");
        expect(monthly).toBe("您在 巴塞罗那 清晨发烧。");
    });

    it("traduce la primera frase de una escena larga", () => {
        expect(
            translateText("Dijiste una palabra que nadie esperaba y la casa entera se detuvo.", "zh"),
        ).toContain("整个屋子都停了下来");
        expect(
            translateText("2026 · 0 岁 · Barcelona, España", "zh"),
        ).toBe("2026 · 0 岁 · 巴塞罗那，西班牙");
    });

    it("localizeDeep traduce texto sin tocar el protocolo ni la semilla", () => {
        const original = {
            id: "game-1",
            worldSeed: "seed-abc",
            status: "playing",
            sex: "female",
            country: "ESP",
            currency: "EUR",
            name: "España",
            givenName: "Ana",
            title: "Nacer en España",
            nested: [{ id: "x", text: "Salud", year: 2026 }],
        };
        const result = localizeDeep(original, "zh");

        expect(result.id).toBe("game-1");
        expect(result.worldSeed).toBe("seed-abc");
        expect(result.status).toBe("playing");
        expect(result.sex).toBe("female");
        expect(result.country).toBe("ESP");
        expect(result.currency).toBe("EUR");
        expect(result.name).toBe("西班牙");
        expect(result.givenName).toBe("Ana");
        expect(result.title).toBe("出生于西班牙");
        expect(result.nested[0]).toEqual({ id: "x", text: "健康", year: 2026 });
        expect(original.name).toBe("España");
    });

    it("tiene un catálogo mínimo verificable para la interfaz principal", () => {
        expect(zhCatalogSize()).toBeGreaterThan(5_000);
        for (const label of ["Salud", "Felicidad", "Conocimiento", "Relaciones", "Nueva vida", "Historial"]) {
            expect(hasTranslation(label), label).toBe(true);
        }
    });
});
