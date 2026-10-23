import { Component, type ErrorInfo, type ReactNode } from "react";
import { Logo } from "./art/Logo";

interface State {
    hasError: boolean;
    message: string;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = { hasError: false, message: "" };

    static getDerivedStateFromError(error: unknown): State {
        return {
            hasError: true,
            message: error instanceof Error ? error.message : "Error inesperado",
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        if (import.meta.env.DEV) {
            console.error("Error de interfaz:", error, info.componentStack);
        }
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="grid min-h-screen place-items-center bg-ink-950 p-6 text-center">
                <div className="glass max-w-lg rounded-3xl p-8">
                    <Logo size={52} className="mx-auto" />
                    <h1 className="mt-6 text-3xl text-parchment">La vida se ha detenido un instante</h1>
                    <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
                        La interfaz encontró un problema inesperado. Si estabas en un duelo, la sala sigue en el servidor:
                        recarga para continuar. Las vidas individuales no se guardan.
                    </p>
                    <p className="mt-4 rounded-xl border border-white/10 bg-ink-950/50 p-3 text-left text-xs text-parchment-faint">
                        {this.state.message}
                    </p>
                    <button
                        type="button"
                        className="mt-6 rounded-xl bg-gold px-5 py-3 text-sm font-semibold text-ink-950"
                        onClick={() => window.location.assign("/")}
                    >
                        Volver al inicio
                    </button>
                </div>
            </div>
        );
    }
}
