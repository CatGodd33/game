import { defineConfig } from "@playwright/test";

/**
 * Las pruebas usan Google Chrome instalado en el sistema para evitar una
 * descarga adicional. En CI se puede ejecutar `npx playwright install chromium`
 * y sustituir `channel` por el navegador incluido de Playwright.
 */
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: false,
    workers: 1,
    timeout: 90_000,
    expect: { timeout: 12_000 },
    reporter: [["list"]],
    use: {
        baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
        channel: process.env.E2E_CHANNEL ?? "chrome",
        headless: true,
        viewport: { width: 1280, height: 900 },
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "off",
        actionTimeout: 12_000,
        navigationTimeout: 25_000,
    },
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : [
            {
                // Aísla las partidas de prueba del almacén local del desarrollador.
                command: "NODE_ENV=test PERSIST_DIR=.e2e-data LOG_LEVEL=warn npm run dev:server",
                url: "http://localhost:4000/api/health",
                reuseExistingServer: true,
                timeout: 120_000,
                stdout: "pipe",
                stderr: "pipe",
            },
            {
                command: "npm run dev:client",
                url: "http://localhost:5173",
                reuseExistingServer: true,
                timeout: 120_000,
                stdout: "pipe",
                stderr: "pipe",
            },
        ],
});
