import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe2, Sparkles } from "lucide-react";
import { DEFAULT_GAME_CONFIG, type GameConfig } from "@life-duel/shared";
import { GameConfigForm } from "../components/game/GameConfigForm";
import { useDemographics } from "../hooks/useDemographics";
import { useSessionStore } from "../features/session/sessionStore";
import { useToast } from "../components/ui/ToastProvider";
import { api } from "../services/api";
import { safeErrorMessage } from "../lib/utils";

export function NewLifePage() {
    const [config, setConfig] = useState<GameConfig>(() => ({
        ...structuredClone(DEFAULT_GAME_CONFIG),
        fixedYear: new Date().getFullYear(),
        maxAge: 105,
        storyMode: true,
        monthlyMode: true,
    }));
    const [busy, setBusy] = useState(false);
    const [rolling, setRolling] = useState(false);
    const [rolledName, setRolledName] = useState("");
    const [revealed, setRevealed] = useState(false);
    const { data } = useDemographics();
    const ensureSession = useSessionStore((s) => s.ensureSession);
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (!rolling || revealed) return;
        const names = data?.countries.map((c) => c.name) ?? ["India", "México", "Nigeria", "España", "Japón"];
        let step = 0;
        const interval = setInterval(() => {
            setRolledName(names[step++ % names.length] ?? "");
        }, 110);
        return () => clearInterval(interval);
    }, [rolling, revealed, data]);

    async function start() {
        if (busy) return;
        if (config.countryMode === "fixed" && !config.fixedCountry) {
            toast.push("Selecciona un país o vuelve al sorteo aleatorio.", "error");
            return;
        }
        setBusy(true);
        setRolling(true);
        setRevealed(false);
        try {
            await ensureSession();
            const { game } = await api.createSolo({
                alias: "Viajero",
                config: {
                    ...config,
                    era: "present",
                    fixedYear: new Date().getFullYear(),
                    maxAge: 105,
                    storyMode: true,
                    monthlyMode: true,
                },
            });
            await new Promise((resolve) => setTimeout(resolve, 2100));
            setRevealed(true);
            setRolledName(game.world.birth.countryName);
            await new Promise((resolve) => setTimeout(resolve, 900));
            navigate(`/partida/${game.id}`);
        } catch (error) {
            toast.push(safeErrorMessage(error), "error");
        } finally {
            setBusy(false);
            setRolling(false);
        }
    }

    if (rolling) {
        return (
            <div className="country-roulette" role="status" aria-label="Eligiendo tu país de nacimiento">
                <div className="roulette-orbit" />
                <p className="roulette-label">{revealed ? "Aquí comienza tu historia" : "En algún lugar del mundo…"}</p>
                <h1 key={rolledName} className={`roulette-country ${revealed ? "final" : ""}`}>
                    {rolledName || "Una nueva vida"}
                </h1>
                <p className="roulette-footer">
                    {revealed ? "Este es el lugar que te ha tocado." : "No elegimos dónde nacemos."}
                </p>
                <div className="roulette-dots"><i /><i /><i /></div>
            </div>
        );
    }

    return (
        <div className="new-life-v5">
            <Link className="life-link" to="/">← Volver</Link>
            <div className="new-life-heading">
                <p className="eyebrow mt-10">Una vida por descubrir</p>
                <h1>¿Dónde te tocará nacer?</h1>
                <p>
                    Naces hoy. Tu país, tu familia y tus circunstancias se sortean; la vida que te espera
                    depende de dónde crezcas, de tu salud y de cada decisión. Nadie elige el año ni la duración:
                    la vida termina cuando el modelo de mortalidad lo determina.
                </p>
            </div>

            <div className="new-life-grid">
                <section className="life-section">
                    <div className="mb-5 flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                            <Globe2 className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div>
                            <h2>Tu nacimiento, hoy</h2>
                            <p className="life-note mt-1">
                                Elige cómo se sortea el país. La duración no se configura: la vida termina
                                cuando lo decide el modelo de mortalidad. Todo lo demás queda en manos de la
                                semilla compartida.
                            </p>
                        </div>
                    </div>
                    <GameConfigForm
                        value={config}
                        onChange={setConfig}
                        countries={data?.countries ?? []}
                        showWeights={false}
                        showContent={false}
                        showAuto={false}
                        disabled={busy}
                    />
                </section>

                <section className="life-section">
                    <h2>Opciones avanzadas</h2>
                    <details>
                        <summary>Contenido y puntuación</summary>
                        <p className="life-note mt-3">
                            Ajusta los temas sensibles y el peso de cada categoría. La puntuación no se puede
                            cambiar con la vida ya empezada.
                        </p>
                        <div className="mt-5">
                            <GameConfigForm
                                value={config}
                                onChange={setConfig}
                                countries={data?.countries ?? []}
                                showCountry={false}
                                showDifficulty={false}
                                showContent
                                showWeights
                                showAuto={false}
                                showInfo={false}
                                disabled={busy}
                            />
                        </div>
                    </details>
                </section>
            </div>

            <div className="new-life-actions">
                <button className="life-primary" onClick={() => void start()} disabled={busy}>
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    {busy ? "Eligiendo tu lugar en el mundo…" : "Nacer"}
                </button>
                <p className="life-note">
                    Primero verás tu registro de nacimiento. La vida empezará cuando estés listo.
                </p>
            </div>
        </div>
    );
}
