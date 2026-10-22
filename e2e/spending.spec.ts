import { test, expect } from "@playwright/test";
test("acciones manuales: préstamo, animales y saldo en una vida adulta", async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("life-duel.session.v1"))).toBe(true);
    const id = await page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        for (let attempt = 0; attempt < 3; attempt++) {
            const created = await fetch("/api/games", { method: "POST", headers, body: JSON.stringify({ alias: "Prueba manual", config: { countryMode: "fixed", fixedCountry: "ESP", fixedYear: 2000, storyMode: true, monthlyMode: true, autoDecisions: false, decisionTimerSeconds: 300, difficulty: "relajada" } }) });
            if (!created.ok) throw new Error(`Crear vida: ${created.status}`);
            let game = (await created.json()).game;
            await fetch(`/api/games/${game.id}/pause`, { method: "POST", headers, body: JSON.stringify({ paused: false }) });
            for (let i = 0; i < 50; i++) {
                game = (await (await fetch(`/api/games/${game.id}`, { headers })).json()).game;
                if (game.status === "finished") break;
                if (game.me.character.age >= 18 && !game.turn.prompt) { await fetch(`/api/games/${game.id}/pause`, { method: "POST", headers, body: JSON.stringify({ paused: true }) }); return game.id as string; }
                const p = game.turn.prompt;
                const response = p ? await fetch(`/api/games/${game.id}/decision`, { method: "POST", headers, body: JSON.stringify({ turn: game.turn.number, decisionId: p.id, optionId: p.options[0].id, idempotencyKey: crypto.randomUUID() }) }) : await fetch(`/api/games/${game.id}/advance`, { method: "POST", headers });
                if (!response.ok) throw new Error(`Avanzar vida: ${response.status}`);
            }
        }
        throw new Error("No se alcanzó la adultez en las vidas de prueba");
    });
    await page.goto(`/partida/${id}`);
    const funeralLater = page.getByRole("button", { name: "Decidir más tarde" });
    const funeralVisible = await funeralLater.waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
    if (funeralVisible) await funeralLater.click();
    await page.getByRole("button", { name: "Gastar e invertir ↗", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: "Gastar e invertir", exact: true })).toBeVisible();
    const headingColor = await page.getByRole("heading", { name: "Gastar e invertir", exact: true }).evaluate(el => getComputedStyle(el).color);
    expect(headingColor).toBe("rgb(48, 62, 54)");
    await page.getByRole("button", { name: "Dinero e inversión", exact: true }).click();
    await page.getByRole("button", { name: /Solicitar préstamo Elige/ }).click();
    await page.getByLabel("Importe de la operación").fill("600");
    await page.getByRole("button", { name: "Confirmar operación", exact: true }).click();
    await expect(page.getByRole("dialog").getByText(/Recibiste un préstamo de 600/)).toBeVisible();
    await page.getByRole("button", { name: "Animales", exact: true }).click();
    await page.getByRole("button", { name: /Adoptar gato/ }).click();
    await page.getByLabel("Cantidad", { exact: true }).fill("3");
    await page.getByLabel("Nombre del animal").fill("Mochi");
    await page.getByRole("button", { name: "Confirmar operación", exact: true }).click();
    await expect(page.getByRole("dialog").getByText(/Llegaron 3 nuevos compañeros/)).toBeVisible();
    await page.screenshot({ path: "artifacts/spend-invest-desktop.png", fullPage: false });
    await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
    await expect(page.getByText("Mochi 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Mochi 3", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Velocidad 16×", exact: true }).click();
    await page.getByRole("button", { name: "Reanudar", exact: true }).click();
    await expect(page.locator(".bank-v3-month")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: "Banco", exact: true })).toBeVisible();
    await expect(page.locator(".bank-v3-row").first()).toBeVisible();
    await expect(page.locator('[aria-label="Árbol familiar"]')).toBeVisible();
    await page.getByRole("button", { name: "Pausar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Reanudar", exact: true })).toBeEnabled();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: "artifacts/monthly-family-desktop.png", fullPage: false });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Gastar e invertir ↗", exact: true }).first().click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("dialog")).toHaveCSS("opacity", "1");
    await page.screenshot({ path: "artifacts/spend-invest-mobile.png", fullPage: false, animations: "disabled" });
});
