import { RelationshipStory } from "./RelationshipStory";
import { PropertyPortfolio } from "./PropertyPortfolio";
import { DuelWaiting } from "./DuelWaiting";
import { FamilyTree } from "./FamilyTree";
import { LifeResume } from "./LifeResume";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { GameView, LifeMoment, TurnRecord } from "@life-duel/shared";
import { CORE_STAT_META, EDUCATION_META, GAME_SPEEDS } from "@life-duel/shared";
import { BriefcaseBusiness, HeartHandshake, PawPrint, Pause, Play, Store, UsersRound } from "lucide-react";
import { api } from "../../services/api";
import { useToast } from "../ui/ToastProvider";
import { safeErrorMessage } from "../../lib/utils";
import { DecisionPanel } from "./DecisionPanel";
import { PixelFamilyScene, PixelPortrait } from "../art/PixelLife";
import { BirthCertificate } from "./BirthCertificate";
import { BankStatement } from "./BankStatement";
import { SpendingPanel } from "./SpendingPanel";
import { LiveLedger } from "./LiveLedger";
import { MobilityPanel } from "./MobilityPanel";
import { DebtPanel } from "./DebtPanel";
import { FuneralPanel } from "./FuneralPanel";
import { Modal } from "../ui/Modal";
import { LocationPanel } from "./LocationPanel";
import { MoneyText } from "../ui/MoneyText";
import { LanguageToggle } from "../ui/LanguageToggle";
import { YearEcho } from "./YearEcho";
import { monthProgressSeconds } from "../../lib/monthProgress";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { buildRecentEntries } from "../../features/life/recentEntries";
import { FOCUS_OPTIONS } from "../../features/life/focusOptions";
import { MobileLifeDashboard } from "./mobile/MobileLife";

const dollars = (n: number) =>
    new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);


const roles: Record<string, string> = {
    mother: "Madre",
    father: "Padre",
    sibling: "Hermano/a",
    child: "Hijo/a",
    partner: "Pareja",
    grandmother: "Abuela",
    grandfather: "Abuelo",
    grandchild: "Nieto/a",
};

const petLabels = { perro: "Perro", gato: "Gato", otro: "Animal" } as const;

export function SoloLife({
    game,
    onGame,
    onDecision,
    submitting,
    countryName,
}: {
    game: GameView;
    onGame: (g: GameView) => void;
    onDecision: (id: string) => void;
    submitting: boolean;
    countryName: (code: string) => string;
}) {
    const [registered, setRegistered] = useState(
        () => game.turn.number > 0 || sessionStorage.getItem(`born:${game.id}`) === "yes",
    );
    const [busy, setBusy] = useState(false);
    const [records, setRecords] = useState<TurnRecord[]>([]);
    const [moments, setMoments] = useState<LifeMoment[]>([]);
    const [historyError, setHistoryError] = useState(false);
    const [birthOpen, setBirthOpen] = useState(false);
    const [spendOpen, setSpendOpen] = useState(false);
    const [mobilityOpen, setMobilityOpen] = useState(false);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const resumeAfterSpending = useRef(false);
    async function openSpending() {
        if (game.status === "playing") {
            if (!await update(() => api.pause(game.id, true))) return;
            resumeAfterSpending.current = true;
        }
        setSpendOpen(true);
    }
    async function closeSpending() {
        if (resumeAfterSpending.current) {
            if (!await update(() => api.pause(game.id, false))) return;
            resumeAfterSpending.current = false;
        }
        setSpendOpen(false);
    }
    const [decisionOpen, setDecisionOpen] = useState(false);
    const [moneyOpen, setMoneyOpen] = useState(false);
    const [debtOpen, setDebtOpen] = useState(false);
    const [funeralOpen, setFuneralOpen] = useState(false);
    const mobileLayout = useMediaQuery("(max-width: 700px)");
    const toast = useToast();
    const c = game.me.character;
    const b = game.world.birth;
    const d = b.details;
    const story = c.story;
    useEffect(() => {
        if ((c.pendingFunerals?.length ?? 0) > 0) setFuneralOpen(true);
    }, [c.pendingFunerals?.length]);
    const paused = game.status === "paused";
    const auto = game.clock.autoDecisions;
    const upgradeAttempted = useRef(false);
    useEffect(() => {
        if (game.config.monthlyMode || upgradeAttempted.current || game.status === "finished") return;
        upgradeAttempted.current = true;
        api.enableMonthly(game.id).then(({ game: next }) => onGame(next)).catch(error => toast.push(safeErrorMessage(error), "error"));
    }, [game.id, game.config.monthlyMode]);
    useEffect(() => { setDecisionOpen(Boolean(game.turn.prompt) && !game.clock.autoDecisions); }, [game.turn.prompt?.id, game.turn.number]);

    const latestTurn = records.at(-1) ?? null;
    const latestBankRecord = useMemo(
        () => [...records].reverse().find((turn) => turn.players[game.me.slot]?.bank?.some((month) => month.income || month.housing || month.food || month.utilities || month.transport || month.health || month.education || month.other)),
        [records, game.me.slot],
    );

    useEffect(() => {
        document.body.classList.add("story-ui");
        return () => document.body.classList.remove("story-ui");
    }, []);

    useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(() => {
            api.history(game.id)
                .then((r) => {
                    if (!cancelled) {
                        setRecords(r.turns);
                        setMoments(r.moments);
                        setHistoryError(false);
                    }
                })
                .catch(() => {
                    if (!cancelled) setHistoryError(true);
                });
        }, 220);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [game.id, game.updatedAt]);

    async function update(action: () => Promise<{ game: GameView }>) {
        if (busy) return false;
        setBusy(true);
        try {
            onGame((await action()).game);
            return true;
        } catch (error) {
            toast.push(safeErrorMessage(error), "error");
            return false;
        } finally {
            setBusy(false);
        }
    }

    async function begin() {
        if (await update(() => api.pause(game.id, false))) {
            sessionStorage.setItem(`born:${game.id}`, "yes");
            setRegistered(true);
        }
    }

    const recentEntries = useMemo(
        () => buildRecentEntries({
            moments,
            records,
            slot: game.me.slot,
            manualActions: c.manualActions ?? [],
            birthYear: b.year,
            limit: 4,
        }),
        [moments, records, game.me.slot, c.manualActions, b.year],
    );

    if (game.duel?.myFinished && !game.final) return <DuelWaiting game={game} />;
    if (!registered && game.turn.number === 0) {
        return (
            <div className="birth-stage">
                <div className="birth-stage-brand">
                    <Link to="/">LIFE<span> / </span>Una vida por descubrir</Link>
                    <span>01 — El comienzo</span>
                </div>
                <BirthCertificate game={game} busy={busy} onBegin={() => void begin()} />
            </div>
        );
    }

    const profit = c.business ? c.business.annualRevenue - c.business.annualCosts : 0;
    const progressSeconds = monthProgressSeconds(Boolean(game.config.monthlyMode), game.clock.decisionTimerSeconds, game.clock.speed);

    const overlays = (
        <>
            <Modal open={birthOpen} onClose={() => setBirthOpen(false)} title="Tu registro de nacimiento" size="lg">
                <BirthCertificate game={game} embedded />
            </Modal>
            {spendOpen && <SpendingPanel game={game} onGame={onGame} onExploreStudies={() => { setSpendOpen(false); setMobilityOpen(true); }} onClose={() => void closeSpending()} />}
            {debtOpen && <DebtPanel game={game} onGame={onGame} onClose={() => setDebtOpen(false)} />}
            {mobilityOpen && <MobilityPanel game={game} onGame={onGame} onClose={() => setMobilityOpen(false)} />}
            {funeralOpen && (c.pendingFunerals?.length ?? 0) > 0 ? <FuneralPanel game={game} onGame={onGame} onClose={() => setFuneralOpen(false)} /> : null}
            <Modal open={decisionOpen && !!game.turn.prompt} onClose={() => setDecisionOpen(false)} title="Un momento para decidir" size="lg">{game.turn.prompt && <><DecisionPanel solo prompt={game.turn.prompt} currency={c.currentCurrency} submitted={game.me.hasSubmitted} ownChoice={game.me.ownChoice} pending={submitting} disabled={paused} onSubmit={onDecision} /><button className="story-button full" onClick={() => setDecisionOpen(false)}>Consultar mi vida primero</button></>}</Modal>
            <Modal open={moneyOpen} onClose={() => setMoneyOpen(false)} title="Economía de tu vida" size="lg">
                <div className="story-finance">
                    <BankStatement statements={latestBankRecord?.players[game.me.slot]?.bank} year={latestBankRecord?.year ?? game.turn.year} />
                    <p>Todo movimiento personal queda registrado en dólares internacionales (PPP).</p>
                    <div><span>Disponible</span><b>{dollars(c.finance.money)}</b></div>
                    <div><span>Deuda</span><b><MoneyText value={c.finance.debt} /></b></div>
                    <div><span>Ingresos anuales</span><b>{dollars(c.finance.annualIncome)}</b></div>
                    <div><span>Gastos anuales</span><b>{dollars(c.finance.annualExpenses)}</b></div>
                    {c.business ? <><div><span>{c.business.name} · ingresos</span><b>{dollars(c.business.annualRevenue)}</b></div><div><span>{c.business.name} · costes</span><b>{dollars(c.business.annualCosts)}</b></div></> : null}
                    {(c.loans ?? []).filter((loan) => loan.active).map((loan) => <div key={loan.id}><span>Préstamo {loan.lender} · {loan.label}</span><b>{dollars(loan.balance)}</b></div>)}
                    {[...c.finance.ledger].reverse().map((tx) => <div key={tx.id}><span>{tx.year} · {tx.label}</span><b>{dollars(tx.amount)}</b></div>)}
                </div>
            </Modal>
        </>
    );

    const statements = game.config.monthlyMode
        ? c.liveEconomy?.statements
        : latestBankRecord?.players[game.me.slot]?.bank;
    const bankYear = game.config.monthlyMode ? game.turn.year : latestBankRecord?.year ?? game.turn.year;

    if (mobileLayout) {
        return (
            <>
                <MobileLifeDashboard
                    game={game}
                    busy={busy}
                    recentEntries={recentEntries}
                    expandedEntry={expandedEntry}
                    historyError={historyError}
                    statements={statements}
                    bankYear={bankYear}
                    latestTurn={latestTurn}
                    progressSeconds={progressSeconds}
                    countryName={countryName}
                    onPause={(next) => void update(() => api.pause(game.id, next))}
                    onSpeed={(speed) => void update(() => api.speed(game.id, speed))}
                    onAuto={(enabled) => void update(() => api.auto(game.id, enabled))}
                    onAdvance={() => void update(() => api.advance(game.id))}
                    onFocus={(focus) => void update(() => api.focus(game.id, focus))}
                    onToggleEntry={(id) => setExpandedEntry(expandedEntry === id ? null : id)}
                    onOpenDecision={() => setDecisionOpen(true)}
                    onOpenSpending={() => void openSpending()}
                    onOpenDebt={() => setDebtOpen(true)}
                    onOpenMoney={() => setMoneyOpen(true)}
                    onOpenBirth={() => setBirthOpen(true)}
                    onOpenMobility={() => setMobilityOpen(true)}
                    onOpenFuneral={() => setFuneralOpen(true)}
                />
                {overlays}
            </>
        );
    }

    return (
        <div className="story-dashboard story-v5">
            <header className="story-toolbar">
                <div className="story-title">
                    <Link to="/" className="story-wordmark">life<span> / </span></Link>
                    <h1>Edad <strong>{c.age}</strong></h1>
                    <div className="story-who">
                        <p>{game.config.monthlyMode ? `${new Date(game.turn.year, game.turn.month ?? 0).toLocaleString("es", { month: "long" })} de ` : ""}{game.turn.year} · {b.givenName} {b.surname}</p>
                        <small>{c.currentLocation}, {countryName(c.currentCountry)} · {c.employment.occupation ?? (c.age < 18 ? "En familia" : "Sin empleo")}</small>
                    </div>
                    <div className="story-cash">
                        <span>Disponible</span>
                        <strong>{dollars(c.finance.money)}</strong>
                        <button type="button" className="story-cash-debt" onClick={() => setDebtOpen(true)}>{c.finance.debt > 0 ? <>Deuda <MoneyText value={c.finance.debt} compact /></> : "Sin deuda"}</button>
                    </div>
                </div>

                {game.duel?.independent && <div className="duel-life-banner"><span>Sala {game.roomCode} · misma vida inicial</span><strong>{game.duel.opponentAlias}: {game.duel.opponentFinished ? "vida completada" : "jugando a su ritmo"}</strong><small>Tu pausa y tus decisiones son independientes. El resultado se revela al terminar ambas vidas.</small></div>}
                <div className="story-controls">
                    <button className="story-button" disabled={busy} onClick={() => void update(() => api.pause(game.id, !paused))}>
                        {paused ? <><Play className="h-3.5 w-3.5" /> Reanudar</> : <><Pause className="h-3.5 w-3.5" /> Pausar</>}
                    </button>
                    <div className="story-speeds">
                        {GAME_SPEEDS.map((s) => (
                            <button
                                key={s}
                                aria-label={`Velocidad ${s}×`}
                                aria-pressed={game.clock.speed === s}
                                disabled={busy}
                                onClick={() => void update(() => api.speed(game.id, s))}
                            >
                                {s}×
                            </button>
                        ))}
                    </div>
                    <button
                        className={`story-button ${auto ? "active" : ""}`}
                        aria-pressed={auto}
                        disabled={busy}
                        onClick={() => void update(() => api.auto(game.id, !auto))}
                    >
                        {auto ? "Estrategia automática · ON" : "Estrategia automática"}
                    </button>
                    <button className="story-button" disabled={busy || paused || !!game.turn.prompt} onClick={() => void update(() => api.advance(game.id))}>Siguiente decisión »</button>
                    <button className="story-button primary" disabled={busy} onClick={() => void openSpending()}>Gastar e invertir ↗</button>
                    <span className="story-live-pill"><i />{paused ? "En pausa" : game.turn.prompt ? "Decisión pendiente" : "La vida avanza"}</span>
                    <LanguageToggle compact />
                    <Link className="story-button story-exit" to="/partidas">Salir ↗</Link>
                </div>

                <div className="story-month-caption"><span>{new Date(game.turn.year, game.turn.month ?? 0).toLocaleDateString("es", { month: "long", year: "numeric" })}</span><span>{game.turn.prompt ? "Una decisión necesita tu atención" : paused ? "El reloj está detenido" : "Al cerrar el mes: movimientos y nueva entrada del diario"}</span></div>
                <div className="story-year-progress">
                    <span
                        key={`${game.turn.number}-${game.turn.month}-${game.clock.speed}-${paused}-${game.clock.deadlineAt}`}
                        style={{
                            animationDuration: `${progressSeconds}s`,
                            animationPlayState: paused || (!!game.turn.prompt && !auto) ? "paused" : "running",
                        }}
                    />
                </div>
            </header>

            <div className="story-columns">
                <aside className="story-left">
                    <LiveLedger onDebtClick={() => setDebtOpen(true)} transactions={c.finance.ledger} statements={game.config.monthlyMode ? c.liveEconomy?.statements : latestBankRecord?.players[game.me.slot]?.bank} year={game.config.monthlyMode ? game.turn.year : latestBankRecord?.year ?? game.turn.year} month={game.turn.month} available={c.finance.money} debt={c.finance.debt} live={!paused && !game.turn.prompt} paused={paused} deadlineAt={game.turn.deadlineAt ?? game.clock.deadlineAt} progressSeconds={progressSeconds} monthlyMode={game.config.monthlyMode} historyHref={`/partida/${game.id}/historial`} />
                    <section className={`identity-pass ${b.sex === "female" ? "rose" : "teal"}`}>
                        <div className="identity-band"><span>Vida · {b.countryCode}</span><span>{b.year}</span></div>
                        <div className="identity-content">
                            <PixelPortrait birth={b} age={c.age} />
                            <h2>{b.givenName}<br />{b.surname}</h2>
                            <dl>
                                <dt>Edad</dt><dd>{c.age} años</dd>
                                <dt>Nacimiento</dt><dd>{countryName(c.birthCountry)}</dd>
                                <dt>Residencia</dt><dd>{c.currentLocation}, {countryName(c.currentCountry)}</dd>
                                <dt>Educación</dt><dd>{EDUCATION_META[c.educationLevel].label}</dd>
                                <dt>Trabajo</dt><dd>{c.employment.occupation ?? "—"}</dd>
                                <dt>Familia</dt><dd>{c.partnerName ? `${c.partnerName} · ` : ""}{c.children} hijos{c.grandchildren ? ` · ${c.grandchildren} nietos` : ""}</dd>
                            </dl>
                        </div>
                        <button className="identity-details" onClick={() => setBirthOpen(true)}>Ver registro de nacimiento ↗</button>
                    </section>

                    <section className="story-panel">
                        <h2>Estado <small>0–100</small></h2>
                        <div className="dashboard-stats">
                            {(Object.keys(CORE_STAT_META) as (keyof typeof CORE_STAT_META)[]).map((key, i) => (
                                <div key={key}>
                                    <span>{CORE_STAT_META[key].label}</span>
                                    <div><i style={{ width: `${c.stats[key]}%`, background: ["#6ee7b7", "#f6d365", "#7dd3fc", "#fda4af"][i] }} /></div>
                                    <b>{Math.round(c.stats[key])}</b>
                                </div>
                            ))}
                        </div>
                        <div className="dashboard-money">
                            <div><span>Disponible</span><b>{dollars(c.finance.money)}</b><small>Saldo en cuenta</small></div>
                            <div><span>Deuda</span><b><MoneyText value={c.finance.debt} compact /></b><small>{c.finance.annualIncome > 0 ? `Ingresos ${dollars(c.finance.annualIncome)}/año` : "Sin ingresos anuales"}</small></div>
                        </div>
                        <button className="story-button full" onClick={() => setMoneyOpen(true)}>Economía y movimientos ↗</button>
                        <button className="story-button full" onClick={() => setDebtOpen(true)}>Ver todas mis deudas{c.finance.debt > 0 ? ` · ${dollars(c.finance.debt)}` : ""} ↗</button>
                    </section>
                    <section className={`story-panel wealth-panel ${game.me.wealthPressure.tier}`}>
                        <h2>Presión patrimonial <small>{game.me.wealthPressure.tier.replace("-", " ")}</small></h2>
                        <div className="wealth-meter" aria-label={`Presión patrimonial ${game.me.wealthPressure.pressure} de 100`}><i style={{ width: `${game.me.wealthPressure.pressure}%` }} /></div>
                        <div className="wealth-facts">
                            <span>Patrimonio neto <b>{dollars(game.me.wealthPressure.netWorth)}</b></span>
                            <span>Liquidez <b>{game.me.wealthPressure.monthsOfRunway} meses</b></span>
                            <span>Mantenimiento anual <b>{dollars(game.me.wealthPressure.annualUpkeep)}</b></span>
                        </div>
                        <p className="story-muted">{game.me.wealthPressure.notes[0]}</p>
                    </section>

                    <button className="story-button primary full" disabled={busy} onClick={() => void openSpending()}>Gastar e invertir ↗</button>
                    <button className="story-button full" disabled={busy || c.age < 17} title={c.age < 17 ? "Disponible a partir de los 17 años" : undefined} onClick={() => setMobilityOpen(true)}>Irme al extranjero · estudiar, trabajar o vivir fuera ↗</button>
                    {c.age < 17 ? <p className="story-muted mobility-hint">Los proyectos internacionales se abren a los 17 años. Mientras tanto, tu vida crece donde estás.</p> : null}
                </aside>

                <main className="story-center">
                    {c.educationPlan && <section className="story-panel education-plan-panel"><p className="story-eyebrow">Tu formación · {c.educationPlan.paused ? "en pausa" : c.employment.status === "employed" ? "a tiempo parcial" : "en curso"}</p><h2>{c.educationPlan.title}</h2><p>{c.educationPlan.institution} · {c.educationPlan.monthsLeft} meses de dedicación pendientes</p><div className="education-plan-facts"><span>Cuota actual <b>{dollars(c.educationPlan.paused ? 0 : c.educationPlan.annualFee / 12 * (c.employment.status === "employed" ? .5 : 1))}/mes</b></span><span>Beca <b>{c.educationPlan.scholarshipPct} %</b></span></div><p className="story-muted">{c.educationPlan.reference}</p><button className="story-button" onClick={() => void openSpending()}>Becas, trabajo y pausa académica ↗</button></section>}
                    <RelationshipStory character={c} year={game.turn.year} />
                    <PixelFamilyScene birth={b} character={c} year={game.turn.year} />
                    {game.turn.prompt && <div className="decision-notice" role="status"><div><span>Una decisión importante · El tiempo espera</span><h2>{game.turn.prompt.title}</h2></div><button className="story-button primary" onClick={() => setDecisionOpen(true)}>Tomar decisión →</button></div>}
                    {(c.pendingFunerals?.length ?? 0) > 0 ? <div className="decision-notice funeral-notice" role="status"><div><span>Una despedida pendiente</span><h2>{c.pendingFunerals![0].relativeName} · {c.pendingFunerals![0].relationship}</h2><p>Elegir ceremonia no cuesta nada hasta que confirmes. La partida no ha cobrado el funeral.</p></div><button className="story-button primary" onClick={() => setFuneralOpen(true)}>Elegir despedida →</button></div> : null}
                    {paused ? (
                        <section className="story-panel resume-panel">
                            <div>
                                <span>El tiempo está detenido</span>
                                <h2>La vida espera tu señal</h2>
                                <p>Puedes reanudar el reloj o cambiar la velocidad cuando quieras.</p>
                            </div>
                            <button className="story-button primary" disabled={busy} onClick={() => void update(() => api.pause(game.id, false))}>
                                Reanudar la vida »
                            </button>
                        </section>
                    ) : null}

                    <details className="story-panel life-journal">
                        <summary>Diario de vida <small>Lo más reciente</small></summary>
                        <div className="journal-scroll">
                            {historyError ? <p role="alert">No se pudo cargar el diario. <Link to={`/partida/${game.id}/historial`}>Abrir historial</Link></p> : null}

                            {recentEntries.map((e) => (
                                <article key={e.id} className={`journal-entry ${e.decision ? "decision-entry" : e.category ? `journal-${e.category}` : /falleci|murió|muerte/i.test(e.text) ? "loss-entry" : /deuda|perdió|despido|enferm/i.test(e.text) ? "warning-entry" : ""}`}>
                                    <span>Edad {e.age}<small>{e.year} · {e.month === 12 ? "cierre anual" : `mes ${e.month}`}{e.category ? ` · ${e.category}` : ""}</small></span>
                                    <p className={e.text.length > 170 && expandedEntry !== e.id ? "journal-excerpt" : undefined}>{e.text}</p>
                                    {e.text.length > 170 ? (
                                        <button
                                            type="button"
                                            className="journal-toggle"
                                            aria-expanded={expandedEntry === e.id}
                                            onClick={() => setExpandedEntry(expandedEntry === e.id ? null : e.id)}
                                        >
                                            {expandedEntry === e.id ? "Leer menos" : "Leer completo"}
                                        </button>
                                    ) : null}
                                </article>
                            ))}
                            {!recentEntries.length ? <p className="story-muted journal-wait">Tu historia acaba de empezar. El mundo continúa mientras creces.</p> : null}
                        </div>
                        <Link to={`/partida/${game.id}/historial`} className="journal-link">Historial completo y exportación ↗</Link>
                    </details>
                    {latestTurn ? <details className="yearly-review" open><summary>Balance del último año · {latestTurn.year}</summary><YearEcho record={latestTurn} slot={game.me.slot} currency={c.currentCurrency} /></details> : null}
                </main>

                <aside className="story-right">
                    <section className="story-panel family-panel">
                        <h2><UsersRound className="h-4 w-4" /> Familia y hogar</h2>{c.partnerProfile && <p className="story-muted">{c.partnerName} · {countryName(c.partnerProfile.country)} · {c.partnerProfile.sharedHousehold ? `Aporta ${dollars(c.partnerProfile.annualIncome)}/año al hogar` : "Todavía mantenéis hogares y cuentas separados"}</p>}
                        {c.familyPlans?.map(plan => <p className="story-muted" key={plan.id}>♡ Preparando la llegada de {plan.name} · {new Date(plan.dueYear, plan.dueMonth).toLocaleDateString("es", { month: "long", year: "numeric" })}</p>)}
                        {c.familyCase && c.familyCase.stage !== "closed" ? <p className="family-case-note">Acuerdo con {c.familyCase.partnerName} · {c.familyCase.stage === "agreement" ? "negociación pendiente" : "revisión en preparación"}. Compensación estimada del juego: {dollars(c.familyCase.claim)}.</p> : null}
                        <FamilyTree character={c} birth={b} year={game.turn.year} />
                        <details className="family-details"><summary>Ver detalles de cada familiar</summary>
                            {(story?.relatives ?? []).map((r) => {
                                const relativeAge = game.turn.year - r.bornYear;
                                return (
                                    <div className={`relative-row ${!r.alive ? "departed" : ""}`} key={r.id}>
                                        <span>{r.generation === "grandchild" ? "Nieto/a" : roles[r.role] ?? "Familiar"}</span>
                                        <div>
                                            <b>{r.name}</b>
                                            <p>{r.alive ? `${relativeAge} años` : `Falleció a los ${r.deathAge} años`}{r.occupation ? ` · ${r.occupation}` : ""}{r.inHousehold === false ? " · fuera del hogar" : ""}</p>
                                            {r.alive && (
                                                <div className="relative-vitals">
                                                    <span>Salud {r.health === null ? "—" : Math.round(r.health ?? 0)}</span>
                                                    {r.alive && r.role === "child" && relativeAge < 18 ? <span>Crianza</span> : null}
                                                </div>
                                            )}
                                            {!r.alive && r.causeOfDeath ? <p className="relative-cause">{r.causeOfDeath}</p> : null}
                                        </div>
                                        <span>{r.alive ? "●" : "✧"}</span>
                                    </div>
                                );
                            })}
                        </details>
                        {!story ? <p className="story-muted">{d?.mother.name} · {d?.father.name}</p> : null}
                        {(c.grandchildren ?? 0) > 0 ? <div className="family-extra"><HeartHandshake className="h-3.5 w-3.5" /> {c.grandchildren} nietos</div> : null}
                        {(c.pets ?? []).map((pet) => (
                            <div className={`pet-row ${!pet.alive ? "departed" : ""}`} key={pet.id}>
                                <PawPrint className="h-3.5 w-3.5" />
                                <div><b>{pet.name}</b><small>{pet.kind ?? petLabels[pet.species]} · {pet.age} años · salud {Math.round(pet.health)}</small></div>
                            </div>
                        ))}
                    </section>

                    <LocationPanel character={c} countryName={countryName} />
                    <PropertyPortfolio character={c} onManage={() => void openSpending()} />
                    <LifeResume character={c} />
                    {c.business ? (
                        <section className="story-panel business-panel">
                            <h2><Store className="h-4 w-4" /> Tu empresa</h2>
                            <div className="business-selector">{[c.business, ...(c.otherBusinesses ?? [])].filter((item): item is NonNullable<typeof item> => !!item).map(item => <button key={item.id} disabled={busy || item.id === c.business?.id} aria-pressed={item.id === c.business?.id} onClick={() => void update(() => api.purchase(game.id, { action: `manage-business-${item.id}`, idempotencyKey: crypto.randomUUID() }))}>{item.name} · {item.active ? item.delegated ? "gestión delegada" : "dirección propia" : "cerrada"}</button>)}</div>
                            <p className="story-muted">Cuentas del último cierre anual. Cada empresa conserva sus gastos, equipo y riesgos.</p>
                            <p className="story-muted">{{ comercio: "Comercio local", clinica: "Consulta médica", tecnologia: "Tecnología", "estudio-musica": "Estudio musical", taller: "Taller y oficios", gastronomia: "Gastronomía" }[c.business.kind]} · {c.currentLocation} · fundada a los {c.business.foundedAge} años</p>
                            {c.business.segment ? <p className="business-segment">{c.business.segment}</p> : null}
                            <div className="business-name"><BriefcaseBusiness className="h-4 w-4" /><strong>{c.business.name}</strong><span>{c.business.active ? "Activa" : "Cerrada"}</span></div>
                            {c.business.trade ? <div className="story-muted"><strong>Ruta comercial · {c.business.trade.destination === "PER" ? "Perú · PEN" : "Italia · EUR"}</strong><p>Anticipo {c.business.trade.advancePct}% · {c.business.trade.insured ? "transporte con cobertura" : "transporte sin cobertura"} · {c.business.trade.qualityControl ? "inspección activa" : "sin inspección"}</p><p>{c.business.trade.lastResult}</p></div> : null}
                            <div className="business-grid">
                                <div><span>Ingresos</span><b>{dollars(c.business.annualRevenue)}</b></div>
                                <div><span>Costes</span><b>{dollars(c.business.annualCosts)}</b></div>
                                <div><span>Beneficio</span><b className={profit >= 0 ? "positive" : "negative"}>{dollars(profit)}</b></div>
                                <div><span>Equipo</span><b>{c.business.employees}</b></div>
                                <div><span>Reputación</span><b>{Math.round(c.business.reputation)}</b></div>
                            </div>
                        </section>
                    ) : null}

                    <section className="story-panel focus-panel">
                        <h2>Enfoque del año</h2>
                        <p>{c.age < 2 ? "Los primeros días" : c.age < 6 ? "Descubriendo el mundo" : c.age < 18 ? "Los años de escuela" : c.age < 65 ? "Construyendo tu camino" : "Una vida de recuerdos"} <span>· {c.currentLocation}</span></p>
                        {story && c.age >= 6 ? (
                            <div className="focus-options">
                                {FOCUS_OPTIONS.filter((f) => c.age >= 18 || f.id !== "work").map((f) => (
                                    <button key={f.id} aria-pressed={story.focus === f.id} disabled={busy} onClick={() => void update(() => api.focus(game.id, f.id))}>
                                        {f.label}<small>{f.effect}</small>
                                    </button>
                                ))}
                            </div>
                        ) : <p className="story-muted">Tu familia cuida de ti. Las pequeñas experiencias se van convirtiendo en recuerdos.</p>}
                    </section>

                    <section className="story-panel life-map-panel">
                        <h2>Tu recorrido</h2>
                        <div className="dashboard-lifemap">
                            {Array.from({ length: Math.min(game.config.maxAge, 105) }, (_, age) => {
                                const record = records.find((r) => r.age === age)?.players[game.me.slot];
                                return <span key={age} title={`${age} años${record ? ` · ${record.decisionTitle}` : ""}`} className={`${age < c.age ? "lived" : ""} ${age === c.age ? "current" : ""}`} />;
                            })}
                        </div>
                        <p className="story-muted">Un cuadro por año. El final no está escrito.</p>
                    </section>
                </aside>
            </div>

            {overlays}
        </div>
    );
}
