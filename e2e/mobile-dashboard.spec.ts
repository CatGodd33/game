import { expect, test, type Page } from "@playwright/test";

/**
 * Comprueba el orden real de la composición móvil, no solo que las clases
 * existan. La vida se crea contra la API para que el test sea rápido y estable.
 */
async function createYoungLife(page: Page): Promise<{ id: string; age: number }> {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("life-duel.session.v1"))).toBe(true);
    return page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        const created = await fetch("/api/games", {
            method: "POST",
            headers,
            body: JSON.stringify({
                alias: "Móvil 2.2",
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
        let game = (await created.json()).game;
        await fetch(`/api/games/${game.id}/pause`, {
            method: "POST",
            headers,
            body: JSON.stringify({ paused: false }),
        });
        for (let index = 0; index < 30; index += 1) {
            game = (await (await fetch(`/api/games/${game.id}`, { headers })).json()).game;
            if (game.me.character.age >= 8 || game.status === "finished") break;
            const prompt = game.turn.prompt;
            const response = prompt
                ? await fetch(`/api/games/${game.id}/decision`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        turn: game.turn.number,
                        decisionId: prompt.id,
                        optionId: prompt.options[0].id,
                        idempotencyKey: crypto.randomUUID(),
                    }),
                })
                : await fetch(`/api/games/${game.id}/advance`, { method: "POST", headers });
            if (!response.ok) throw new Error(`Avanzar vida: ${response.status}`);
        }
        await fetch(`/api/games/${game.id}/pause`, {
            method: "POST",
            headers,
            body: JSON.stringify({ paused: true }),
        });
        return { id: game.id as string, age: game.me.character.age as number };
    });
}

test.describe("dashboard móvil 2.2", () => {
    test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

    test("prioriza tiempo, familia, foco, pulso, memoria, pasaporte y banco", async ({ page }) => {
        test.setTimeout(150_000);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));

        const life = await createYoungLife(page);
        await page.goto(`/partida/${life.id}`);
        await expect(page.getByRole("heading", { name: /Edad/ }).first()).toBeVisible();

        const funeralLater = page.getByRole("button", { name: "Decidir más tarde" });
        if (await funeralLater.isVisible().catch(() => false)) await funeralLater.click();

        await expect(page.getByTestId("mobile-toolbar")).toBeVisible();
        expect(await page.locator(".story-columns").count()).toBe(0);

        const order = await page.evaluate(() =>
            [...document.querySelectorAll("[data-testid]")].map((element) => element.getAttribute("data-testid")),
        );
        expect(order).toEqual([
            "mobile-toolbar",
            "mobile-family",
            "mobile-focus",
            "mobile-vitals",
            "mobile-record",
            "mobile-full-stats",
            "mobile-passport",
            "mobile-bank",
        ]);

        expect(await page.locator(".mobile-record-entry").count()).toBeLessThanOrEqual(4);
        expect(await page.locator(".mobile-focus-option").count()).toBe(5);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

        await page.screenshot({ path: "artifacts/life-dashboard-mobile-v22.png", fullPage: true, animations: "disabled" });

        await page.getByRole("button", { name: "Gastar e invertir ↗", exact: true }).click();
        await expect(page.getByRole("heading", { name: "Gastar e invertir", exact: true })).toBeVisible();
        await expect(page.getByRole("button", { name: "Mi empresa", exact: true })).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Dinero e inversión", exact: true })).toHaveCount(0);
        await expect(page.getByText(/Decisiones de tu edad/)).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: "artifacts/spend-invest-mobile-v22.png", fullPage: false, animations: "disabled" });

        expect(errors).toEqual([]);
    });
});
