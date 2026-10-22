import { expect, test, type Page } from "@playwright/test";

async function createPausedAdult(page: Page): Promise<string> {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => !!localStorage.getItem("life-duel.session.v1"))).toBe(true);
    return page.evaluate(async () => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const created = await fetch("/api/games", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    alias: "Prueba de deudas",
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
            if (!created.ok) throw new Error(`Crear vida: ${created.status}`);
            let game = (await created.json()).game;
            await fetch(`/api/games/${game.id}/pause`, { method: "POST", headers, body: JSON.stringify({ paused: false }) });
            for (let index = 0; index < 50; index += 1) {
                game = (await (await fetch(`/api/games/${game.id}`, { headers })).json()).game;
                if (game.status === "finished") break;
                if (game.me.character.age >= 18 && !game.turn.prompt) {
                    await fetch(`/api/games/${game.id}/pause`, { method: "POST", headers, body: JSON.stringify({ paused: true }) });
                    return game.id as string;
                }
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
        }
        throw new Error("No se alcanzó la adultez");
    });
}

async function debtValue(page: Page, gameId: string): Promise<number> {
    return page.evaluate(async (id) => {
        const token = JSON.parse(localStorage.getItem("life-duel.session.v1")!).token;
        const response = await fetch(`/api/games/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        const body = (await response.json()) as { game: { me: { character: { finance: { debt: number } } } } };
        return body.game.me.character.finance.debt;
    }, gameId);
}

async function dismissLifeOverlays(page: Page) {
    await page.locator(".story-cash").waitFor({ state: "visible", timeout: 15_000 });
    for (let attempt = 0; attempt < 4; attempt += 1) {
        const later = page.getByRole("button", { name: "Decidir más tarde", exact: true });
        if (await later.waitFor({ state: "visible", timeout: 1_500 }).then(() => true).catch(() => false)) {
            await later.click();
            continue;
        }
        const consult = page.getByRole("button", { name: "Consultar mi vida primero", exact: true });
        if (await consult.isVisible().catch(() => false)) {
            await consult.click();
            continue;
        }
        const closeWindow = page.getByRole("button", { name: "Cerrar ventana", exact: true });
        if (await closeWindow.isVisible().catch(() => false)) {
            await closeWindow.click();
            continue;
        }
        break;
    }
    await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("deudas: vista completa y pago dirigido validado por el servidor", async ({ page }) => {
    test.setTimeout(120_000);
    const id = await createPausedAdult(page);
    await page.goto(`/partida/${id}`);
    await dismissLifeOverlays(page);

    // Genera una deuda conocida para poder identificarla en la vista.
    await page.getByRole("button", { name: "Gastar e invertir ↗", exact: true }).first().click();
    await page.getByRole("button", { name: "Dinero e inversión", exact: true }).click();
    await page.getByRole("button", { name: /Solicitar préstamo Elige/ }).click();
    await page.getByLabel("Importe de la operación").fill("600");
    await page.getByRole("button", { name: "Confirmar operación", exact: true }).click();
    await expect(page.getByRole("dialog").getByText(/Recibiste un préstamo de 600/)).toBeVisible();
    await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();

    const before = await debtValue(page, id);
    await page.getByRole("button", { name: /Ver todas mis deudas/ }).first().click();
    await expect(page.getByRole("heading", { name: "Tus deudas" })).toBeVisible();
    const row = page.locator(".debt-row").filter({ hasText: "Préstamo personal manual" });
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Pagar", exact: true }).click();
    await page.getByLabel("Importe a pagar (PPP)").fill("100");
    await page.getByRole("button", { name: "Confirmar pago", exact: true }).click();
    await expect(page.locator(".debt-notice").filter({ hasText: /Pagaste 100.00 dólares PPP/ })).toBeVisible();
    await page.screenshot({ path: "artifacts/debt-panel-desktop.png", fullPage: false });

    const after = await debtValue(page, id);
    expect(Math.round((before - after) * 100) / 100).toBe(100);
    await page.getByRole("button", { name: "Cerrar ventana", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: /Ver todas mis deudas/ }).first().click();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "artifacts/debt-panel-mobile.png", fullPage: false });
});
