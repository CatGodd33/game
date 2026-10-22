import type { CharacterState, CoreStatKey, WealthPressure } from "@life-duel/shared";
import { BookOpen, HeartPulse, Home, Smile, Sparkles, UsersRound, Wallet } from "lucide-react";
import { CORE_STAT_META } from "@life-duel/shared";
import { MoneyText } from "../../ui/MoneyText";

const ICONS = {
    health: HeartPulse,
    happiness: Smile,
    knowledge: BookOpen,
    relationships: UsersRound,
} as const;

const doll = (value: number) => Math.round(value).toLocaleString("es");
const STAT_KEYS: CoreStatKey[] = ["health", "happiness", "knowledge", "relationships"];

function riskLabel(risk: number): string {
    if (!Number.isFinite(risk) || risk <= 0) return "< 0,1 %";
    const pct = risk * 100;
    return pct < 0.1 ? "< 0,1 %" : `${pct.toFixed(1)} %`;
}

export function MobileVitals({ character: c }: { character: CharacterState }) {
    return (
        <section className="mobile-card mobile-vitals" aria-label="Estadísticas principales" data-testid="mobile-vitals">
            <div className="mobile-vitals-grid">
                {STAT_KEYS.map((key) => {
                    const Icon = ICONS[key];
                    const value = Math.round(c.stats[key]);
                    return (
                        <article key={key} className={`mobile-vital mobile-vital-${key}`}>
                            <span className="mobile-vital-icon" aria-hidden="true"><Icon /></span>
                            <div>
                                <span>{CORE_STAT_META[key].label}</span>
                                <strong>{value}</strong>
                            </div>
                            <div
                                className="mobile-vital-bar"
                                role="progressbar"
                                aria-label={CORE_STAT_META[key].label}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={value}
                            >
                                <i style={{ width: `${Math.max(0, Math.min(100, c.stats[key]))}%` }} />
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    );
}

export function MobileFullStats({
    character: c,
    wealthPressure,
}: {
    character: CharacterState;
    wealthPressure: WealthPressure;
}) {
    const latestMedical = [...(c.medicalHistory ?? [])].slice(-3).reverse();
    const chronic = (c.chronicConditions ?? []).slice(0, 4);
    const coverage = { ninguno: "Sin cobertura", basico: "Cobertura básica", premium: "Cobertura amplia" }[c.healthPlan];

    return (
        <section className="mobile-card mobile-full-stats" aria-labelledby="mobile-health-title" data-testid="mobile-full-stats">
            <header className="mobile-card-head">
                <div>
                    <p className="mobile-kicker">Tu estado</p>
                    <h2 id="mobile-health-title">Salud y vida</h2>
                </div>
                <span className="mobile-scale">Escala 0–100</span>
            </header>

            <div className="mobile-full-stat-list">
                {STAT_KEYS.map((key) => {
                    const Icon = ICONS[key];
                    const value = Math.round(c.stats[key]);
                    return (
                        <div key={key} className={`mobile-full-stat mobile-full-stat-${key}`}>
                            <Icon aria-hidden="true" />
                            <div>
                                <span>{CORE_STAT_META[key].label}</span>
                                <div
                                    className="mobile-full-bar"
                                    role="progressbar"
                                    aria-label={CORE_STAT_META[key].label}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={value}
                                >
                                    <i style={{ width: `${Math.max(0, Math.min(100, c.stats[key]))}%` }} />
                                </div>
                            </div>
                            <strong>{value}</strong>
                        </div>
                    );
                })}
            </div>

            <div className="mobile-health-grid">
                <article>
                    <HeartPulse aria-hidden="true" />
                    <span>Riesgo de mortalidad</span>
                    <strong>{riskLabel(c.mortalityRisk)}</strong>
                </article>
                <article>
                    <Sparkles aria-hidden="true" />
                    <span>Atención sanitaria</span>
                    <strong>{coverage}</strong>
                </article>
                <article>
                    <Home aria-hidden="true" />
                    <span>Calidad de vivienda</span>
                    <strong>{Math.round(c.housingQuality)}/100</strong>
                </article>
                <article>
                    <Wallet aria-hidden="true" />
                    <span>Nivel de vida</span>
                    <strong>{Math.round(c.livingStandard)}/100</strong>
                </article>
            </div>

            <div className="mobile-money-grid" aria-label="Resumen económico">
                <div><span>Disponible</span><strong><MoneyText value={c.finance.money} compact /></strong></div>
                <div><span>Deuda</span><strong><MoneyText value={c.finance.debt} compact /></strong></div>
                <div><span>Ingresos anuales</span><strong><MoneyText value={c.finance.annualIncome} compact /></strong></div>
                <div><span>Gastos anuales</span><strong><MoneyText value={c.finance.annualExpenses} compact /></strong></div>
            </div>

            <p className="mobile-wealth-line">
                Patrimonio neto <b>${doll(wealthPressure.netWorth)}</b>
                <span>·</span> Liquidez <b>{wealthPressure.monthsOfRunway} meses</b>
                <span>·</span> Presión <b>{wealthPressure.tier.replace("-", " ")}</b>
            </p>

            {chronic.length ? (
                <div className="mobile-chronic" aria-label="Condiciones crónicas">
                    <span>Condiciones</span>
                    {chronic.map((condition) => <b key={condition}>{condition}</b>)}
                </div>
            ) : null}

            {latestMedical.length ? (
                <details className="mobile-medical">
                    <summary>Historial médico <span>{c.medicalHistory.length} registros</span></summary>
                    <ul>
                        {latestMedical.map((record) => (
                            <li key={`${record.year}-${record.condition}`}>
                                <span>{record.age} años · {record.severity}</span>
                                <strong>{record.condition}</strong>
                                <p>{record.note}</p>
                            </li>
                        ))}
                    </ul>
                </details>
            ) : (
                <p className="mobile-empty-note">Todavía no hay episodios médicos registrados.</p>
            )}
        </section>
    );
}
