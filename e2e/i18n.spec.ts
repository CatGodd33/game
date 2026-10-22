import { expect, test, type Page } from "@playwright/test";

/**
 * La localización es solo de presentación: cambia la portada, la partida y los
 * textos del servidor, pero no la semilla ni los identificadores. Este flujo
 * comprueba también que volver a español restaura el texto original.
 */
async function createChineseLife(page: Page): Promise<string> {
    return page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Locale": "zh",
        };
        const created = await fetch("/api/games", {
            method: "POST",
            headers,
            body: JSON.stringify({
                alias: "中文测试",
                config: {
                    countryMode: "fixed",
                    fixedCountry: "ESP",
                    fixedYear: 2000,
                    storyMode: true,
                    monthlyMode: true,
                    autoDecisions: false,
                    decisionTimerSeconds: 300,
                    difficulty: "relajada",
                },
            }),
        });
        if (!created.ok) throw new Error(`创建人生失败: ${created.status}`);
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

test.describe("versión en chino", () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test("portada, partida y vuelta al español", async ({ page }) => {
        await page.goto("/?lang=zh");
        await expect(page.locator("html")).toHaveAttribute("lang", "zh-Hans");
        await expect(page.getByRole("heading", { name: /同样的人生/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /新生命/ }).first()).toBeVisible();
        await page.screenshot({ path: "artifacts/life-duel-home-zh.png", fullPage: false });

        const id = await createChineseLife(page);
        await page.goto(`/partida/${id}`);
        await expect(page.getByText("健康", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("幸福", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("知识", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("人际关系", { exact: true }).first()).toBeVisible();
        await page.screenshot({ path: "artifacts/life-duel-game-zh.png", fullPage: false });

        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
        await page.screenshot({ path: "artifacts/life-duel-game-mobile-zh.png", fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });

        await page.getByRole("button", { name: "Español", exact: true }).click();
        await expect(page.locator("html")).toHaveAttribute("lang", "es");
        await expect(page.getByText("Salud", { exact: true }).first()).toBeVisible();
        await expect(page.getByText("Felicidad", { exact: true }).first()).toBeVisible();
    });
});
