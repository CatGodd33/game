import { expect, test, type Page } from "@playwright/test";

/**
 * Cubre las pantallas que no aparecen en el flujo corto de i18n: configuración
 * de nacimiento, acceso al duelo, ajustes, guardados, comparador y final.
 * No valida la calidad editorial de cada frase, pero sí que la página se
 * renderiza en chino y que el estado de la partida sigue siendo legible.
 */
async function sessionReady(page: Page): Promise<string> {
    await page.goto("/?lang=zh");
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("life-duel.session.v1"))).toBe(true);
    return page.evaluate(() => JSON.parse(localStorage.getItem("life-duel.session.v1")!).token as string);
}

async function createSolo(page: Page, auto = false): Promise<string> {
    return page.evaluate(async (automatic) => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Locale": "zh" };
        const response = await fetch("/api/games", {
            method: "POST",
            headers,
            body: JSON.stringify({
                alias: "页面测试",
                config: {
                    countryMode: "fixed", fixedCountry: "ESP", fixedYear: 2000,
                    storyMode: true, monthlyMode: false, autoDecisions: automatic,
                    decisionTimerSeconds: 300, difficulty: "relajada",
                },
            }),
        });
        if (!response.ok) throw new Error(`创建失败 ${response.status}`);
        const game = (await response.json()).game;
        sessionStorage.setItem(`born:${game.id}`, "yes");
        await fetch(`/api/games/${game.id}/pause`, {
            method: "POST", headers, body: JSON.stringify({ paused: false }),
        });
        return game.id as string;
    }, auto);
}

async function finishGame(page: Page, id: string): Promise<boolean> {
    return page.evaluate(async (gameId) => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Locale": "zh" };
        for (let index = 0; index < 140; index += 1) {
            const stateResponse = await fetch(`/api/games/${gameId}`, { headers });
            const state = (await stateResponse.json()).game;
            if (state.status === "finished") return true;
            const prompt = state.turn?.prompt;
            if (prompt?.options?.length) {
                await fetch(`/api/games/${gameId}/decision`, {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        turn: state.turn.number,
                        decisionId: prompt.id,
                        optionId: prompt.options[0].id,
                        idempotencyKey: `i18n-pages-${index}-${prompt.id}-${prompt.options[0].id}`.slice(0, 80),
                    }),
                });
                continue;
            }
            const advance = await fetch(`/api/games/${gameId}/advance`, { method: "POST", headers });
            if (!advance.ok) {
                const body = await advance.text();
                throw new Error(`推进失败 ${advance.status}: ${body.slice(0, 120)}`);
            }
        }
        return false;
    }, id);
}

async function expectChinesePage(page: Page, path: string, screenshot: string): Promise<void> {
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
    await expect(page.locator("main").first()).toBeVisible();
    await expect
        .poll(async () => (await page.locator("main").first().innerText()).length, { timeout: 15_000 })
        .toBeGreaterThan(40);
    const text = await page.locator("main").first().innerText();
    expect(text, `La página ${path} no contiene caracteres chinos`).toMatch(/[\u4e00-\u9fff]/);
    await page.screenshot({ path: screenshot, fullPage: false });
}

test.describe("chino: pantallas secundarias", () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test("configuración, duelo, ajustes, guardados, comparador y final", async ({ page }) => {
        test.setTimeout(300_000);
        await sessionReady(page);

        await expectChinesePage(page, "/nueva-vida", "artifacts/life-duel-new-life-zh.png");
        await expectChinesePage(page, "/duelo", "artifacts/life-duel-duel-zh.png");
        await expectChinesePage(page, "/ajustes", "artifacts/life-duel-settings-zh.png");
        await expectChinesePage(page, "/partidas", "artifacts/life-duel-saves-zh.png");

        const roomCode = await page.evaluate(async () => {
            const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
            const response = await fetch("/api/rooms", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Locale": "zh" },
                body: JSON.stringify({
                    alias: "房主",
                    config: {
                        countryMode: "random", fixedYear: 2026, storyMode: true, monthlyMode: true,
                        autoDecisions: false, decisionTimerSeconds: 300, difficulty: "relajada",
                    },
                }),
            });
            if (!response.ok) throw new Error(`创建房间失败 ${response.status}`);
            return (await response.json()).lobby.code as string;
        });
        await expectChinesePage(page, `/sala/${roomCode}`, "artifacts/life-duel-room-zh.png");

        const id = await createSolo(page);
        await expectChinesePage(page, `/partida/${id}/comparar`, "artifacts/life-duel-compare-zh.png");

        expect(await finishGame(page, id)).toBe(true);
        await expectChinesePage(page, `/partida/${id}/final`, "artifacts/life-duel-final-zh.png");
        await expect(page.getByText(/[\u4e00-\u9fff]/).first()).toBeVisible();
    });
});
