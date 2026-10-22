import { expect, test, type Page } from "@playwright/test";

async function prepare(page: Page, autoDecisions = false): Promise<string> {
    await page.goto("/?lang=zh");
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("life-duel.session.v1"))).toBe(true);
    return page.evaluate(async (auto) => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Locale": "zh" };
        const created = await fetch("/api/games", {
            method: "POST",
            headers,
            body: JSON.stringify({
                alias: "中文人生",
                config: {
                    countryMode: "fixed", fixedCountry: "ESP", fixedYear: 2000, storyMode: true,
                    monthlyMode: true, autoDecisions: auto, decisionTimerSeconds: 300, difficulty: "relajada",
                },
            }),
        });
        if (!created.ok) throw new Error(`创建失败 ${created.status}`);
        const game = (await created.json()).game;
        sessionStorage.setItem(`born:${game.id}`, "yes");
        await fetch(`/api/games/${game.id}/pause`, { method: "POST", headers, body: JSON.stringify({ paused: false }) });
        return game.id as string;
    }, autoDecisions);
}

test.describe("chino: contenido del motor", () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test("decisión, consecuencia e historial se presentan en chino", async ({ page }) => {
        const id = await prepare(page);
        const prompt = await page.evaluate(async (gameId) => {
            const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
            const headers = { Authorization: `Bearer ${token}`, "X-Locale": "zh" };
            for (let i = 0; i < 80; i += 1) {
                const response = await fetch(`/api/games/${gameId}`, { headers });
                const game = (await response.json()).game;
                if (game.turn.prompt) return game.turn.prompt as { title: string; options: Array<{ label: string }> };
                if (game.status === "finished") break;
                const advance = await fetch(`/api/games/${gameId}/advance`, { method: "POST", headers });
                if (!advance.ok) throw new Error(`推进失败 ${advance.status}`);
            }
            return null;
        }, id);

        expect(prompt, "La vida debe alcanzar una decisión").not.toBeNull();
        expect(prompt!.title, `Título sin traducir: ${prompt!.title}`).toMatch(/[\u4e00-\u9fff]/);
        expect(prompt!.options.length).toBeGreaterThanOrEqual(2);
        for (const option of prompt!.options) {
            expect(option.label, `Opción sin traducir: ${option.label}`).toMatch(/[\u4e00-\u9fff]/);
        }

        await page.goto(`/partida/${id}`);
        await expect(page.getByRole("dialog")).toBeVisible();
        await expect(page.locator("#decision-title")).toHaveText(new RegExp(prompt!.title.slice(0, 4)));
        await page.screenshot({ path: "artifacts/life-duel-decision-zh.png", fullPage: false });

        await page.locator('section[aria-labelledby="decision-title"] button').first().click();
        await page.waitForTimeout(800);
        const consult = page.getByRole("button", { name: "先看看我的人生", exact: true });
        if (await consult.isVisible().catch(() => false)) await consult.click();
        await page.goto(`/partida/${id}/historial`);
        await expect(page.getByRole("heading").first()).toContainText(/[\u4e00-\u9fff]/);
        await page.screenshot({ path: "artifacts/life-duel-history-zh.png", fullPage: false });
    });
});
