import { expect, test, type Page } from "@playwright/test";

/**
 * Regresión de la 2.3: la barra de vida dejó de ser sticky y el diario se
 * carga cerrado. Al desplazarse por la página, la altura de la cabecera no
 * debe cambiar ni empujar el contenido que el usuario está leyendo.
 */
async function createPausedLife(page: Page): Promise<string> {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("life-duel.session.v1"))).toBe(true);
    return page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const created = await fetch("/api/games", {
            method: "POST",
            headers,
            body: JSON.stringify({
                alias: "Estabilidad PC",
                config: {
                    countryMode: "fixed",
                    fixedCountry: "ESP",
                    fixedYear: 2000,
                    storyMode: true,
                    monthlyMode: true,
                    autoDecisions: true,
                    decisionTimerSeconds: 300,
                    difficulty: "relajada",
                },
            }),
        });
        if (!created.ok) throw new Error(`Crear vida: ${created.status}`);
        const game = (await created.json()).game;
        sessionStorage.setItem(`born:${game.id}`, "yes");
        await fetch(`/api/games/${game.id}/pause`, {
            method: "POST",
            headers,
            body: JSON.stringify({ paused: true }),
        });
        return game.id as string;
    });
}

test.describe("estabilidad de composición en escritorio", () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test("la cabecera no cambia de altura ni arrastra el scroll", async ({ page }) => {
        const id = await createPausedLife(page);
        await page.goto(`/partida/${id}`);
        await expect(page.locator(".story-toolbar")).toBeVisible();
        await expect(page.locator(".life-journal")).toBeVisible();

        const headerPosition = await page.locator(".story-toolbar").evaluate((element) => getComputedStyle(element).position);
        expect(headerPosition).toBe("relative");

        const toolbarHeight = await page.locator(".story-toolbar").evaluate((element) => element.getBoundingClientRect().height);
        expect(toolbarHeight).toBeLessThan(360);

        await page.locator(".life-journal").scrollIntoViewIfNeeded();
        const before = await page.evaluate(() => ({
            scrollY: window.scrollY,
            height: document.documentElement.scrollHeight,
            toolbar: document.querySelector(".story-toolbar")?.getBoundingClientRect().height ?? 0,
        }));

        // El diario y los widgets cargan datos de forma asíncrona tras el render.
        await page.waitForTimeout(1_800);

        const after = await page.evaluate(() => ({
            scrollY: window.scrollY,
            height: document.documentElement.scrollHeight,
            toolbar: document.querySelector(".story-toolbar")?.getBoundingClientRect().height ?? 0,
        }));

        expect(Math.abs(after.scrollY - before.scrollY)).toBeLessThanOrEqual(1);
        expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(after.toolbar - before.toolbar)).toBeLessThanOrEqual(0.5);
    });
});
