import { expect, test, type Page } from "@playwright/test";

async function readGame(page: Page) {
    return page.evaluate(async () => {
        const raw = localStorage.getItem("life-duel.session.v1");
        if (!raw) throw new Error("Sin sesión en localStorage");
        const { token } = JSON.parse(raw) as { token: string };
        const match = window.location.pathname.match(/\/partida\/([0-9a-f-]+)/);
        if (!match?.[1]) throw new Error("No se pudo obtener el id de la partida");
        const response = await fetch(`/api/games/${match[1]}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`GET partida falló (${response.status})`);
        return (await response.json()) as {
            game: {
                id: string;
                mode: string;
                status: string;
                world: { birth: unknown; seedFingerprint: string };
                turn: {
                    number: number;
                    sharedEvents: Array<{ eventId: string }>;
                    prompt: { id: string; options: Array<{ id: string; label: string }> } | null;
                };
                opponent: { hasSubmitted: boolean; ownChoice: unknown } | null;
                lastResolution: {
                    players: Record<string, { optionId: string; optionLabel: string }>;
                } | null;
            };
        };
    });
}

test.describe("flujos principales", () => {

    async function advanceDuelUntilPrompt(page: Page) {
        for (let index = 0; index < 8; index += 1) {
            if (await page.locator("#decision-title").isVisible().catch(() => false)) return;
            const advance = page.getByRole("button", { name: /Vivir el siguiente año/ });
            if (await advance.isVisible().catch(() => false)) {
                await advance.click();
                await page.waitForTimeout(600);
                continue;
            }
            await page.waitForTimeout(400);
        }
    }

    async function dismissFuneral(page: Page) {
        const later = page.getByRole("button", { name: "Decidir más tarde" });
        if (await later.isVisible().catch(() => false)) await later.click();
    }

    async function advanceUntilDecision(page: Page, targetAge: number) {
        await dismissFuneral(page);
        await page.getByRole("button", { name: /Siguiente decisión/ }).click();
        await expect(page.getByRole("heading", { name: new RegExp(`Edad ${targetAge}`) })).toBeVisible();
    }

    test("vida individual: decisión, historial, comparador y final", async ({ page }) => {
        test.setTimeout(180_000);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));

        await page.goto("/");
        await expect(page.getByRole("heading", { name: /La misma vida/ })).toBeVisible();
        await page.getByRole("link", { name: /^Nueva vida$/ }).first().click();
        await expect(page).toHaveURL(/\/nueva-vida$/);
        await expect(page.getByRole("heading", { name: "¿Dónde te tocará nacer?" })).toBeVisible();

        await page.getByRole("button", { name: /Elegir país/ }).click();
        await page.getByLabel("País concreto").selectOption("ESP");
        await page.getByRole("button", { name: /^Nacer/ }).click();
        await expect(page).toHaveURL(/\/partida\/[0-9a-f-]+$/, { timeout: 25_000 });
        await expect(page.getByText("Registro de nacimiento", { exact: true })).toBeVisible();
        await expect(page.getByText("Madre", { exact: true })).toBeVisible();
        await expect(page.getByText("Padre", { exact: true })).toBeVisible();
        await expect(page.getByText("Ingresos familiares", { exact: true })).toBeVisible();
        await expect(page.getByRole("img", { name: /Mapa del mundo/ })).toBeVisible();
        await page.screenshot({ path: "artifacts/birth-certificate-desktop.png", fullPage: true });
        await page.getByRole("button", { name: /Comenzar esta vida/ }).click();
        await expect(page.getByRole("heading", { name: /Edad/ }).first()).toBeVisible();

        const initialState = await readGame(page);
        expect(initialState.game.mode).toBe("solo");
        expect(initialState.game.status).toBe("playing");

        expect(initialState.game.turn.prompt).toBeNull();
        await advanceUntilDecision(page, 2);
        await expect(page.getByRole("heading", { name: /Edad 2/ })).toBeVisible();
        await expect(page.locator("#decision-title")).toBeVisible();
        await page.locator('section[aria-labelledby="decision-title"] button').first().click();
        await expect(page.getByText(/Diste tus primeros pasos/).first()).toBeVisible();
        await expect(page.getByRole("heading", { name: /Edad 2/ })).toBeVisible({ timeout: 20_000 });

        const afterFirstTurn = await readGame(page);
        expect(afterFirstTurn.game.turn.number).toBeGreaterThan(1);

        await expect(page.getByRole("region", { name: "Banco y cuenta personal" })).toBeVisible();
        expect(await page.locator(".bank-v3-row").count()).toBeLessThanOrEqual(5);

        // El calendario narrativo incluye un hito a los 4 años además del de 6.
        await advanceUntilDecision(page, 4);
        await expect(page.getByRole("heading", { name: /Edad 4/ })).toBeVisible();
        await page.locator('section[aria-labelledby="decision-title"] button').first().click();
        await expect(page.getByRole("heading", { name: /Edad 4/ })).toBeVisible({ timeout: 20_000 });
        await advanceUntilDecision(page, 6);
        await expect(page.getByRole("heading", { name: /Edad 6/ })).toBeVisible();
        await page.getByRole("button", { name: "Consultar mi vida primero" }).click();
        await page.getByRole("button", { name: /Estudiar/ }).click();
        await expect(page.getByRole("button", { name: /Estudiar/ })).toHaveAttribute("aria-pressed", "true");
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.locator(".story-title").click({ position: { x: 600, y: 10 } });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        await page.screenshot({ path: "artifacts/life-dashboard-desktop.png", fullPage: false });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: "artifacts/life-dashboard-mobile.png", fullPage: true });
        await page.setViewportSize({ width: 1280, height: 900 });

        await page.goto(`/partida/${initialState.game.id}/comparar`);
        await expect(page).toHaveURL(/\/comparar$/);
        await expect(page.getByRole("heading", { name: "Dos caminos sobre la misma semilla" })).toBeVisible();
        await expect(page.getByText("Esta vida no tiene rival todavía")).toBeVisible();

        await page.goto(`/partida/${initialState.game.id}/historial`);
        await expect(page.getByRole("heading", { name: "Todo lo que ocurrió, año a año" })).toBeVisible();
        await page.getByRole("button", { name: "Archivo anual" }).click();
        await expect(page.getByText("Sucesos del mundo").first()).toBeVisible();
        await expect(page.getByRole("button", { name: /Exportar JSON/ })).toBeVisible();

        const token = await page.evaluate(() => {
            const raw = localStorage.getItem("life-duel.session.v1");
            if (!raw) throw new Error("Sin sesión");
            return (JSON.parse(raw) as { token: string }).token;
        });
        const gameId = initialState.game.id;
        const headers = { Authorization: `Bearer ${token}` };
        let game: {
            status: string;
            turn: { number: number; prompt: { id: string; options: Array<{ id: string }> } | null } | null;
        } | null = null;

        // El avance final se hace desde el contexto de peticiones de Playwright;
        // no dentro de un evaluate largo: así una vida de 60+ años no bloquea el
        // hilo del navegador ni depende de que la pestaña siga ejecutando JS.
        for (let index = 0; index < 500; index += 1) {
            const response = await page.request.get(`/api/games/${gameId}`, { headers });
            if (!response.ok()) throw new Error(`No se pudo leer la partida (${response.status()})`);
            game = (await response.json()).game;
            if (game?.status === "finished") break;
            const prompt = game?.turn?.prompt;
            if (!prompt) {
                const advance = await page.request.post(`/api/games/${gameId}/advance`, { headers });
                if (!advance.ok()) throw new Error(`Avance rechazado (${advance.status()})`);
                continue;
            }
            const option = prompt.options[0];
            const decision = await page.request.post(`/api/games/${gameId}/decision`, {
                headers,
                data: {
                    turn: game.turn.number,
                    decisionId: prompt.id,
                    optionId: option.id,
                    idempotencyKey: `e2e-${game.turn.number}-${Date.now()}-${index}`,
                },
            });
            if (!decision.ok()) throw new Error(`Decisión rechazada (${decision.status()})`);
        }
        if (game?.status !== "finished") throw new Error("La vida no terminó");

        await page.goto(`/partida/${gameId}/final`);
        await expect(page.getByRole("heading", { name: "El balance de una vida" })).toBeVisible();
        await expect(page.getByRole("region", { name: "Recuerdo y balance de esta vida" })).toBeVisible();
        await expect(page.getByRole("button", { name: /Compartir tarjeta/ })).toBeVisible();
        await expect(page.getByRole("button", { name: /Descargar tarjeta/ })).toBeVisible();
        await expect(page.getByRole("link", { name: /Historial completo/ })).toBeVisible();
        await expect(page.getByText(/Puntuación|puntuación/).first()).toBeVisible();

        expect(errors, `Errores de página: ${errors.join(" | ")}`).toEqual([]);
    });

    test("duelo en dos navegadores: misma vida, decisiones privadas y sincronización", async ({ browser, baseURL }) => {
        const hostContext = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } });
        const guestContext = await browser.newContext({ baseURL, viewport: { width: 1280, height: 900 } });
        const host = await hostContext.newPage();
        const guest = await guestContext.newPage();
        const hostErrors: string[] = [];
        const guestErrors: string[] = [];
        host.on("pageerror", (error) => hostErrors.push(error.message));
        guest.on("pageerror", (error) => guestErrors.push(error.message));

        try {
            await host.goto("/duelo");
            await expect(host.getByRole("heading", { name: "La misma vida. Dos formas de vivirla." })).toBeVisible();
            await host.getByLabel(/Tu alias/i).fill("Host E2E");
            await host.getByRole("button", { name: /Crear sala de duelo/ }).click();
            await host.waitForURL(/\/sala\/[A-Z0-9]{6}$/, { timeout: 25_000 });
            const code = host.url().split("/").pop()!;
            await expect(host.getByText(code, { exact: true })).toBeVisible();
            await expect(host.getByRole("heading", { name: "Preparados para la misma vida" })).toBeVisible();

            await guest.goto("/duelo?modo=unirse");
            await guest.getByLabel("Código de sala").fill(code);
            await guest.getByLabel(/Tu alias/i).fill("Guest E2E");
            await expect(guest.getByText("Sala encontrada")).toBeVisible({ timeout: 15_000 });
            await guest.getByRole("button", { name: /Unirme al duelo/ }).click();
            await guest.waitForURL(new RegExp(`/sala/${code}$`), { timeout: 25_000 });
            await expect(guest.getByText("Host E2E")).toBeVisible();

            await guest.getByRole("button", { name: /Estoy listo/ }).click();
            await expect(host.getByText("Guest E2E")).toBeVisible({ timeout: 15_000 });
            await host.getByRole("button", { name: /Estoy listo/ }).click();
            await expect(host.getByRole("button", { name: /Comenzar duelo/ })).toBeEnabled({ timeout: 15_000 });
            await host.getByRole("button", { name: /Comenzar duelo/ }).click();

            await host.waitForURL(/\/partida\/[0-9a-f-]+$/, { timeout: 25_000 });
            await guest.waitForURL(/\/partida\/[0-9a-f-]+$/, { timeout: 25_000 });
            const hostUrlId = host.url().match(/\/partida\/([0-9a-f-]+)$/)?.[1];
            const guestUrlId = guest.url().match(/\/partida\/([0-9a-f-]+)$/)?.[1];
            expect(hostUrlId).toBeTruthy();
            expect(guestUrlId).toBe(hostUrlId);

            const hostStart = (await readGame(host)).game;
            const guestStart = (await readGame(guest)).game;
            expect(hostStart.world.birth).toEqual(guestStart.world.birth);
            expect(hostStart.world.seedFingerprint).toBe(guestStart.world.seedFingerprint);
            expect(hostStart.turn.sharedEvents.map((event) => event.eventId)).toEqual(
                guestStart.turn.sharedEvents.map((event) => event.eventId),
            );
            expect(hostStart.turn.prompt?.id).toBe(guestStart.turn.prompt?.id);

            await host.getByRole("switch", { name: "Decisiones automáticas" }).click();
            await expect(host.getByRole("switch", { name: "Decisiones automáticas" })).toHaveAttribute("aria-checked", "false");
            await advanceDuelUntilPrompt(host);
            await expect(guest.locator("#decision-title")).toBeVisible({ timeout: 20_000 });

            const hostOptions = host.locator('section[aria-labelledby="decision-title"] button');
            const guestOptions = guest.locator('section[aria-labelledby="decision-title"] button');
            const optionCount = await hostOptions.count();
            expect(optionCount).toBeGreaterThan(0);
            const guestOptionIndex = optionCount > 1 && (await guestOptions.count()) > 1 ? 1 : 0;

            await hostOptions.first().click();
            await expect(host.getByText("Decisión privada registrada")).toBeVisible({ timeout: 15_000 });

            await expect
                .poll(async () => (await readGame(guest)).game.opponent?.hasSubmitted, { timeout: 15_000 })
                .toBe(true);
            const guestPending = (await readGame(guest)).game;
            expect(guestPending.opponent?.ownChoice).toBeNull();
            await expect(guest.getByText(/No puedes ver su elección pendiente/)).toBeVisible();

            await guestOptions.nth(guestOptionIndex).click();
            await expect.poll(async () => (await readGame(host)).game.turn.number, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
            await expect.poll(async () => (await readGame(guest)).game.turn.number, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
            await expect(host.getByRole("heading", { name: /años|historia/ }).first()).toBeVisible({ timeout: 20_000 });
            await expect(guest.getByRole("heading", { name: /años|historia/ }).first()).toBeVisible({ timeout: 20_000 });

            const hostAfter = (await readGame(host)).game;
            const guestAfter = (await readGame(guest)).game;
            expect(hostAfter.turn.number).toBeGreaterThanOrEqual(1);
            expect(guestAfter.turn.number).toBeGreaterThanOrEqual(1);
            expect(hostAfter.lastResolution?.players["1"]?.optionId).toBeTruthy();
            expect(hostAfter.lastResolution?.players["2"]?.optionId).toBeTruthy();
            if (optionCount > 1) {
                expect(hostAfter.lastResolution?.players["1"]?.optionId).not.toBe(
                    hostAfter.lastResolution?.players["2"]?.optionId,
                );
            }
            expect(hostAfter.turn.sharedEvents.map((event) => event.eventId)).toEqual(
                guestAfter.turn.sharedEvents.map((event) => event.eventId),
            );

            expect(hostErrors, `Errores del anfitrión: ${hostErrors.join(" | ")}`).toEqual([]);
            expect(guestErrors, `Errores del invitado: ${guestErrors.join(" | ")}`).toEqual([]);
        } finally {
            await hostContext.close();
            await guestContext.close();
        }
    });
});
