import { expect, test } from "@playwright/test";
import { DECISIONS } from "../server/src/simulation/decisions.js";

/**
 * El atlas es una página estática autocontenida servida desde `client/public`.
 * No necesita backend para abrirse, pero comparte despliegue con el juego.
 */
test("atlas espacial: dos entradas, ramas acumulativas, constelación y móvil", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/mapa-decisiones.html");

    const startQuestion = page.locator('[data-kind="question"][data-decision="story_first_encounter"]');
    const adultQuestion = page.locator('[data-kind="question"][data-decision="tiempo_propio"]');

    await expect(page.locator("#map-data")).toHaveCount(1);
    await expect(startQuestion).toBeVisible();
    await expect(adultQuestion).toBeVisible();
    await expect(page.getByText("Entrada A · Infancia", { exact: false })).toBeVisible();
    await expect(page.getByText("Entrada B · Adultez", { exact: false })).toBeVisible();
    await expect(page.locator("#question-count")).toHaveText("2");
    await expect(page.locator("#branch-count")).toHaveText("0");

    const metadata = await page.locator("#map-data").evaluate((element) => {
        const data = JSON.parse(element.textContent ?? "{}");
        return {
            decisions: data.totals.decisions,
            options: data.totals.options,
            events: data.totals.events,
            roots: data.guide.roots.map((root: { decisionId: string }) => root.decisionId),
        };
    });
    expect(metadata.decisions).toBe(DECISIONS.length);
    expect(metadata.options).toBe(DECISIONS.reduce((sum, decision) => sum + decision.options.length, 0));
    expect(metadata.roots).toEqual(["story_first_encounter", "tiempo_propio"]);

    await page.screenshot({ path: "artifacts/decision-map-desktop.png", fullPage: false });

    // La primera opción abre una consecuencia y una nueva pregunta sin eliminar
    // la pregunta raíz ni sus otras opciones.
    await page.locator('[data-kind="option"][data-option="observe"]').first().click();
    await expect(page.locator('[data-kind="question"][data-decision="infancia_ruta_curioso"]')).toBeAttached();
    await expect(startQuestion).toBeAttached();
    await expect(page.locator('[data-kind="option"][data-option="explore"]').first()).toBeAttached();
    await expect(page.locator("#branch-count")).toHaveText("1");
    await expect(page.locator("#details")).toHaveClass(/open/);
    await expect(page.locator("#details-body h2")).toContainText("Examinar con calma");
    await page.waitForTimeout(400);

    await page.screenshot({ path: "artifacts/decision-map-branch.png", fullPage: false });

    // Se puede elegir otra opción de la misma pregunta: las dos ramas conviven.
    await page.locator('[data-kind="option"][data-option="explore"]').first().evaluate((element) => {
        (element as HTMLElement).click();
    });
    await expect(page.locator("#branch-count")).toHaveText("2");
    await expect(page.locator('[data-kind="question"][data-decision="infancia_ruta_aventurero"]')).toBeAttached();
    await expect(page.locator('[data-kind="question"][data-decision="infancia_ruta_curioso"]')).toBeAttached();
    await expect(startQuestion).toBeAttached();

    // La rama guiada llega a la adultez y al curso con todas las piezas reales.
    await page.locator('[data-kind="option"][data-option="camino_0"]').first().evaluate((element) => {
        (element as HTMLElement).click();
    });
    await expect(page.locator('[data-kind="question"][data-decision="tiempo_propio"]')).toHaveCount(2);
    await page.locator('[data-kind="option"][data-option="aprender"]').first().evaluate((element) => {
        (element as HTMLElement).click();
    });
    await expect(page.locator('[data-kind="question"][data-decision="ruta_curso_proyecto"]')).toBeAttached();
    await page.locator('[data-kind="option"][data-option="acreditar"]').first().evaluate((element) => {
        (element as HTMLElement).click();
    });
    await expect(page.locator('[data-kind="question"][data-decision="ruta_beca_exterior"]')).toBeAttached();

    // El zoom es real y el panel se puede cerrar; el mapa sigue navegable.
    await page.locator(".detail-close").click();
    const initialZoom = await page.locator("#zoom-level").textContent();
    await page.locator("#zoom-in").click();
    await expect(page.locator("#zoom-level")).not.toHaveText(initialZoom ?? "");
    await page.locator("#zoom-reset").click();
    await expect(page.locator("#zoom-level")).toHaveText("100%");

    // La constelación busca en todas las decisiones y añade una pregunta real.
    await page.locator("#constellation-open").click();
    await expect(page.locator("#constellation")).toBeVisible();
    await expect(page.locator(".constellation-node")).toHaveCount(DECISIONS.length);
    await page.locator("#constellation-search").fill("epidemia");
    const epidemicResult = page.locator('#constellation-results [data-add-decision="respuesta_epidemia"]');
    await expect(epidemicResult).toBeVisible();
    await epidemicResult.click();
    await expect(page.locator("#constellation")).toBeHidden();
    await expect(page.locator('[data-kind="question"][data-decision="respuesta_epidemia"]')).toBeAttached();
    await expect(page.getByText("Una epidemia cambia las reglas", { exact: false }).first()).toBeVisible();

    // Una recarga no deja la página en un estado roto ni genera errores JS.
    await page.reload();
    await expect(startQuestion).toBeVisible();
    await expect(adultQuestion).toBeVisible();

    // Móvil: lienzo sin overflow horizontal, controles y entrada de infancia visibles.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('[data-kind="question"][data-decision="story_first_encounter"]')).toBeVisible();
    await expect(page.locator("#view-map")).toBeVisible();
    await expect(page.locator("#constellation-open")).toBeVisible();
    await expect(page.locator("#zoom-in")).toBeVisible();
    await page.waitForTimeout(800);
    const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    await page.screenshot({ path: "artifacts/decision-map-mobile.png", fullPage: false });

    expect(errors, `Errores de página: ${errors.join(" | ")}`).toEqual([]);
});
