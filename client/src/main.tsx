import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces";
import "./styles/index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LocaleProvider } from "./i18n/LocaleProvider";

const root = document.getElementById("root");
if (!root) throw new Error("No se encontró el nodo raíz de LIFE DUEL.");

createRoot(root).render(
    <StrictMode>
        <LocaleProvider>
            <ErrorBoundary>
                <App />
            </ErrorBoundary>
        </LocaleProvider>
    </StrictMode>,
);
