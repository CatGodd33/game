import { Link } from "react-router-dom";
import {
    ArrowRight,
    BriefcaseBusiness,
    ChevronDown,
    CircleDollarSign,
    Clock3,
    GraduationCap,
    HeartHandshake,
    History,
    Landmark,
    MapPin,
    Pause,
    PawPrint,
    Play,
    Sparkles,
    Store,
    UsersRound,
    Wallet,
    Zap,
} from "lucide-react";
import type {
    GameView,
    LifeFocus,
    MonthlyStatement,
    TurnRecord,
} from "@life-duel/shared";
import { GAME_SPEEDS } from "@life-duel/shared";
import type { RecentLifeEntry } from "../../../features/life/recentEntries";
import { PixelFamilyScene } from "../../art/PixelLife";
import { MoneyText } from "../../ui/MoneyText";
import { LiveLedger } from "../LiveLedger";
import { RelationshipStory } from "../RelationshipStory";
import { FamilyTree } from "../FamilyTree";
import { LifeResume } from "../LifeResume";
import { LocationPanel } from "../LocationPanel";
import { PropertyPortfolio } from "../PropertyPortfolio";
import { YearEcho } from "../YearEcho";
import { MobileFamilyStrip } from "./MobileFamilyStrip";
import { MobileFocusCard } from "./MobileFocusCard";
import { MobileFullStats, MobileVitals } from "./MobileVitals";
import { PassportCard } from "./PassportCard";
import { MobileLifeRecord } from "./MobileLifeRecord";

const dollars = (value: number) =>
    new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

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

const businessLabels: Record<string, string> = {
    comercio: "Comercio local",
    clinica: "Consulta médica",
    tecnologia: "Tecnología",
    "estudio-musica": "Estudio musical",
    taller: "Taller y oficios",
    gastronomia: "Gastronomía",
};

function monthLabel(year: number, month: number | undefined, monthly: boolean): string {
    if (monthly) {
        return new Date(year, month ?? 0).toLocaleDateString("es", { month: "long", year: "numeric" });
    }
    return String(year);
}

function statusText(game: GameView, paused: boolean): string {
    if (paused) return "En pausa";
    if (game.turn.prompt) return "Decisión pendiente";
    return "La vida avanza";
}

export interface MobileLifeDashboardProps {
    game: GameView;
    busy: boolean;
    recentEntries: RecentLifeEntry[];
    expandedEntry: string | null;
    historyError: boolean;
    statements?: MonthlyStatement[];
    bankYear: number;
    latestTurn: TurnRecord | null;
    progressSeconds: number;
    countryName: (code: string) => string;
    onPause: (paused: boolean) => void;
    onSpeed: (speed: (typeof GAME_SPEEDS)[number]) => void;
    onAuto: (enabled: boolean) => void;
    onAdvance: () => void;
    onFocus: (focus: LifeFocus) => void;
    onToggleEntry: (id: string) => void;
    onOpenDecision: () => void;
    onOpenSpending: () => void;
    onOpenDebt: () => void;
    onOpenMoney: () => void;
    onOpenBirth: () => void;
    onOpenMobility: () => void;
    onOpenFuneral: () => void;
}

export function MobileLifeDashboard({
    game,
    busy,
    recentEntries,
    expandedEntry,
    historyError,
    statements,
    bankYear,
    latestTurn,
    progressSeconds,
    countryName,
    onPause,
    onSpeed,
    onAuto,
    onAdvance,
    onFocus,
    onToggleEntry,
    onOpenDecision,
    onOpenSpending,
    onOpenDebt,
    onOpenMoney,
    onOpenBirth,
    onOpenMobility,
    onOpenFuneral,
}: MobileLifeDashboardProps) {
    const c = game.me.character;
    const b = game.world.birth;
    const d = b.details;
    const story = c.story;
    const paused = game.status === "paused";
    const auto = game.clock.autoDecisions;
    const prompt = game.turn.prompt;
    const pendingFuneral = c.pendingFunerals?.[0];
    const businessProfit = c.business ? c.business.annualRevenue - c.business.annualCosts : 0;
    const nextLabel = prompt ? "Decidir" : paused ? "Reanudar" : "Avanzar";
    const nextAction = prompt ? onOpenDecision : paused ? () => onPause(false) : onAdvance;
    const nextTitle = prompt?.title ?? (paused ? "La vida espera tu señal" : "El próximo año está por escribir");
    const nextCopy = prompt
        ? "Tu elección cambia esta vida. El tiempo no avanza hasta que decidas."
        : paused
            ? "Puedes volver cuando quieras. Nada de lo vivido se pierde."
            : "Continúa cuando estés listo. Las consecuencias se resolverán en el servidor.";

    return (
        <div className="story-dashboard story-v5 mobile-v22">
            <header className="mobile-topbar" data-testid="mobile-toolbar">
                <div className="mobile-topline">
                    <Link to="/" className="mobile-wordmark" aria-label="LIFE DUEL, inicio">
                        life<span>/</span>duel
                    </Link>
                    <span className={`mobile-live ${paused ? "is-paused" : prompt ? "is-pending" : ""}`}>
                        <i aria-hidden="true" />
                        {statusText(game, paused)}
                    </span>
                    <Link to="/partidas" className="mobile-exit" aria-label="Salir y ver mis vidas">
                        Salir
                    </Link>
                </div>

                <div className="mobile-identity">
                    <div className="mobile-age">
                        <span>Año de vida</span>
                        <h1>Edad <strong>{c.age}</strong></h1>
                        <p>{b.givenName} {b.surname}</p>
                    </div>
                    <div className="mobile-cash">
                        <button type="button" className="mobile-cash-main" onClick={onOpenMoney} aria-label="Abrir economía y movimientos">
                            <span>Disponible ahora</span>
                            <strong><MoneyText value={c.finance.money} compact /></strong>
                        </button>
                        <button type="button" className="mobile-cash-debt" onClick={onOpenDebt}>
                            Deuda {c.finance.debt > 0 ? <MoneyText value={c.finance.debt} compact /> : "0"}
                        </button>
                    </div>
                </div>

                <div className="mobile-context">
                    <span><Clock3 aria-hidden="true" /> {monthLabel(game.turn.year, game.turn.month, Boolean(game.config.monthlyMode))}</span>
                    <span><MapPin aria-hidden="true" /> {c.currentLocation}, {countryName(c.currentCountry)}</span>
                    <span><BriefcaseBusiness aria-hidden="true" /> {c.employment.occupation ?? (c.age < 18 ? "En familia" : c.employment.status === "retired" ? "Jubilación" : "Sin empleo")}</span>
                </div>

                <div className="mobile-controls">
                    <button
                        type="button"
                        className="mobile-control"
                        disabled={busy}
                        onClick={() => onPause(!paused)}
                        aria-label={paused ? "Reanudar" : "Pausar"}
                    >
                        {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
                        <span>{paused ? "Reanudar" : "Pausar"}</span>
                    </button>
                    <button
                        type="button"
                        className={`mobile-control mobile-auto ${auto ? "is-on" : ""}`}
                        disabled={busy}
                        aria-pressed={auto}
                        onClick={() => onAuto(!auto)}
                    >
                        <Zap aria-hidden="true" />
                        <span>Auto</span>
                    </button>
                    <div className="mobile-speeds" aria-label="Velocidad del tiempo">
                        {GAME_SPEEDS.map((speed) => (
                            <button
                                key={speed}
                                type="button"
                                aria-label={`Velocidad ${speed}×`}
                                aria-pressed={game.clock.speed === speed}
                                disabled={busy}
                                onClick={() => onSpeed(speed)}
                            >
                                {speed}×
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    type="button"
                    className={`mobile-next ${prompt ? "is-decision" : paused ? "is-paused" : ""}`}
                    disabled={busy || (!prompt && !paused && game.status === "finished")}
                    onClick={nextAction}
                >
                    <span className="mobile-next-copy">
                        <small>{prompt ? "Una decisión importante" : paused ? "Partida en pausa" : "Siguiente paso"}</small>
                        <strong>{nextTitle}</strong>
                        <em>{nextCopy}</em>
                    </span>
                    <span className="mobile-next-cta">
                        {nextLabel}
                        <ArrowRight aria-hidden="true" />
                    </span>
                </button>

                <div className="mobile-clock">
                    <span>{prompt ? "El reloj espera tu decisión" : paused ? "Reloj detenido" : auto ? "Estrategia automática activa" : "Cierre de mes en curso"}</span>
                    <span>{game.config.monthlyMode ? `Mes ${(game.turn.month ?? 0) + 1} de 12` : "Ciclo anual"}</span>
                </div>
                <div className="mobile-progress" aria-hidden="true">
                    <span
                        key={`${game.turn.number}-${game.turn.month}-${game.clock.speed}-${paused}-${game.clock.deadlineAt}`}
                        style={{
                            animationDuration: `${progressSeconds}s`,
                            animationPlayState: paused || (prompt && !auto) ? "paused" : "running",
                        }}
                    />
                </div>
            </header>

            <main className="mobile-life">
                {game.duel?.independent ? (
                    <section className="mobile-card mobile-duel" aria-label="Estado del duelo">
                        <div>
                            <span>Sala {game.roomCode} · misma vida</span>
                            <strong>{game.duel.opponentAlias}</strong>
                            <small>{game.duel.opponentFinished ? "ha completado su vida" : "sigue jugando a su ritmo"}</small>
                        </div>
                        <Link to={`/partida/${game.id}/comparar`}>Comparar <ArrowRight aria-hidden="true" /></Link>
                    </section>
                ) : null}

                <section className="mobile-card mobile-family" aria-labelledby="mobile-family-title" data-testid="mobile-family">
                    <header className="mobile-card-head">
                        <div>
                            <p className="mobile-kicker">Quienes te acompañan</p>
                            <h2 id="mobile-family-title">Tu familia</h2>
                        </div>
                        <span className="mobile-count"><UsersRound aria-hidden="true" /> {story?.relatives.length ?? 0}</span>
                    </header>
                    <PixelFamilyScene birth={b} character={c} year={game.turn.year} />
                    <MobileFamilyStrip character={c} birth={b} year={game.turn.year} />
                </section>

                {pendingFuneral ? (
                    <section className="mobile-card mobile-alert mobile-funeral" role="status">
                        <div>
                            <span>Una despedida pendiente</span>
                            <h2>{pendingFuneral.relativeName} · {pendingFuneral.relationship}</h2>
                            <p>La partida no ha cobrado nada. Elige cómo despedirte.</p>
                        </div>
                        <button type="button" className="mobile-inline-action" onClick={onOpenFuneral}>Elegir ceremonia</button>
                    </section>
                ) : null}

                <MobileFocusCard
                    age={c.age}
                    focus={story?.focus}
                    busy={busy}
                    onFocus={onFocus}
                    onSpend={onOpenSpending}
                />

                <MobileVitals character={c} />

                <MobileLifeRecord
                    entries={recentEntries}
                    expandedEntry={expandedEntry}
                    onToggle={onToggleEntry}
                    historyHref={`/partida/${game.id}/historial`}
                    historyError={historyError}
                />

                <MobileFullStats character={c} wealthPressure={game.me.wealthPressure} />

                <PassportCard birth={b} character={c} countryName={countryName} onOpenBirth={onOpenBirth} />

                <div className="mobile-card mobile-bank" data-testid="mobile-bank">
                    <LiveLedger
                        onDebtClick={onOpenDebt}
                        transactions={c.finance.ledger}
                        statements={statements}
                        year={bankYear}
                        month={game.turn.month}
                        available={c.finance.money}
                        debt={c.finance.debt}
                        live={!paused && !prompt}
                        paused={paused}
                        deadlineAt={game.turn.deadlineAt ?? game.clock.deadlineAt}
                        progressSeconds={progressSeconds}
                        monthlyMode={game.config.monthlyMode}
                        historyHref={`/partida/${game.id}/historial`}
                    />
                </div>

                <section className="mobile-section-title" aria-label="Más sobre tu vida">
                    <span>El resto de tu vida</span>
                    <h2>Para cuando quieras mirar más lejos</h2>
                </section>

                {c.educationPlan ? (
                    <details className="mobile-card mobile-accordion">
                        <summary>
                            <span className="mobile-acc-icon"><GraduationCap aria-hidden="true" /></span>
                            <span><strong>Formación en curso</strong><small>{c.educationPlan.title}</small></span>
                            <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                        </summary>
                        <div className="mobile-acc-body">
                            <section className="mobile-acc-panel">
                                <p className="mobile-kicker">Tu formación · {c.educationPlan.paused ? "en pausa" : c.employment.status === "employed" ? "a tiempo parcial" : "en curso"}</p>
                                <h3>{c.educationPlan.title}</h3>
                                <p>{c.educationPlan.institution} · {c.educationPlan.monthsLeft} meses de dedicación pendientes</p>
                                <div className="mobile-acc-facts">
                                    <span>Cuota actual <b>{dollars(c.educationPlan.paused ? 0 : c.educationPlan.annualFee / 12 * (c.employment.status === "employed" ? .5 : 1))}/mes</b></span>
                                    <span>Beca <b>{c.educationPlan.scholarshipPct} %</b></span>
                                </div>
                                <p className="mobile-muted">{c.educationPlan.reference}</p>
                                <button type="button" className="mobile-inline-action" onClick={onOpenSpending}>Becas, trabajo y pausa académica</button>
                            </section>
                        </div>
                    </details>
                ) : null}

                {c.partnerName ? (
                    <details className="mobile-card mobile-accordion">
                        <summary>
                            <span className="mobile-acc-icon"><HeartHandshake aria-hidden="true" /></span>
                            <span><strong>Tu relación</strong><small>{c.partnerName} y tú</small></span>
                            <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                        </summary>
                        <div className="mobile-acc-body mobile-acc-plain">
                            <RelationshipStory character={c} year={game.turn.year} />
                        </div>
                    </details>
                ) : null}

                <details className="mobile-card mobile-accordion">
                    <summary>
                        <span className="mobile-acc-icon"><MapPin aria-hidden="true" /></span>
                        <span><strong>Dónde vives</strong><small>{c.currentLocation}, {countryName(c.currentCountry)}</small></span>
                        <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                    </summary>
                    <div className="mobile-acc-body mobile-acc-plain">
                        <LocationPanel character={c} countryName={countryName} />
                        <div className="mobile-home-facts">
                            <p><span>Familia de origen</span><b>{b.family.label}</b></p>
                            <p><span>Hogar</span><b>{d?.housing ?? "—"}</b></p>
                            <p><span>Ingresos del hogar al nacer</span><b>{d ? dollars(d.annualHouseholdIncome) : "—"}</b></p>
                        </div>
                    </div>
                </details>

                <details className="mobile-card mobile-accordion">
                    <summary>
                        <span className="mobile-acc-icon"><Landmark aria-hidden="true" /></span>
                        <span><strong>Patrimonio y bienes</strong><small>{c.assets?.length ?? 0} bienes registrados</small></span>
                        <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                    </summary>
                    <div className="mobile-acc-body mobile-acc-plain">
                        <PropertyPortfolio character={c} onManage={onOpenSpending} />
                        <button type="button" className="mobile-inline-action" onClick={onOpenMoney}>Ver todos los movimientos</button>
                    </div>
                </details>

                <details className="mobile-card mobile-accordion">
                    <summary>
                        <span className="mobile-acc-icon"><History aria-hidden="true" /></span>
                        <span><strong>Trayectoria y logros</strong><small>Formación, trabajo e hitos</small></span>
                        <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                    </summary>
                    <div className="mobile-acc-body mobile-acc-plain">
                        <LifeResume character={c} />
                        <div className="mobile-milestones">
                            {c.milestones.slice(-6).reverse().map((milestone) => (
                                <p key={milestone.id}><span>{milestone.year}</span>{milestone.title}</p>
                            ))}
                        </div>
                    </div>
                </details>

                {c.business ? (
                    <details className="mobile-card mobile-accordion">
                        <summary>
                            <span className="mobile-acc-icon"><Store aria-hidden="true" /></span>
                            <span><strong>Tu empresa</strong><small>{c.business.name}</small></span>
                            <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                        </summary>
                        <div className="mobile-acc-body">
                            <section className="mobile-acc-panel">
                                <div className="mobile-business-head">
                                    <BriefcaseBusiness aria-hidden="true" />
                                    <div><strong>{c.business.name}</strong><span>{c.business.active ? "Activa" : "Cerrada"} · {businessLabels[c.business.kind] ?? c.business.kind}</span></div>
                                </div>
                                <div className="mobile-business-grid">
                                    <div><span>Ingresos</span><b>{dollars(c.business.annualRevenue)}</b></div>
                                    <div><span>Costes</span><b>{dollars(c.business.annualCosts)}</b></div>
                                    <div><span>Beneficio</span><b className={businessProfit >= 0 ? "positive" : "negative"}>{dollars(businessProfit)}</b></div>
                                    <div><span>Equipo</span><b>{c.business.employees}</b></div>
                                    <div><span>Reputación</span><b>{Math.round(c.business.reputation)}</b></div>
                                </div>
                                <button type="button" className="mobile-inline-action" onClick={onOpenSpending}>Gestionar mi empresa</button>
                            </section>
                        </div>
                    </details>
                ) : null}

                <details className="mobile-card mobile-accordion">
                    <summary>
                        <span className="mobile-acc-icon"><UsersRound aria-hidden="true" /></span>
                        <span><strong>Familia en detalle</strong><small>Árbol, edades y mascotas</small></span>
                        <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                    </summary>
                    <div className="mobile-acc-body">
                        <FamilyTree character={c} birth={b} year={game.turn.year} />
                        <div className="mobile-relative-list">
                            {(story?.relatives ?? []).map((relative) => {
                                const relativeAge = game.turn.year - relative.bornYear;
                                return (
                                    <div className={`mobile-relative ${relative.alive ? "" : "is-departed"}`} key={relative.id}>
                                        <span>{relative.generation === "grandchild" ? "Nieto/a" : roles[relative.role] ?? "Familiar"}</span>
                                        <div>
                                            <b>{relative.name}</b>
                                            <p>{relative.alive ? `${relativeAge} años` : `Falleció a los ${relative.deathAge} años`}{relative.occupation ? ` · ${relative.occupation}` : ""}</p>
                                            {relative.alive ? <small>Salud {relative.health === null ? "—" : Math.round(relative.health ?? 0)}</small> : relative.causeOfDeath ? <small>{relative.causeOfDeath}</small> : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {(c.pets ?? []).length ? (
                            <div className="mobile-pets">
                                <p className="mobile-kicker">Animales del hogar</p>
                                {(c.pets ?? []).map((pet) => (
                                    <div key={pet.id} className={pet.alive ? "" : "is-departed"}>
                                        <PawPrint aria-hidden="true" />
                                        <span><b>{pet.name}</b><small>{pet.kind ?? petLabels[pet.species]} · {pet.age} años · salud {Math.round(pet.health)}</small></span>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                        <button type="button" className="mobile-inline-action" onClick={onOpenSpending}>Tiempo juntos y cuidados</button>
                    </div>
                </details>

                <details className="mobile-card mobile-accordion">
                    <summary>
                        <span className="mobile-acc-icon"><Sparkles aria-hidden="true" /></span>
                        <span><strong>Tu recorrido</strong><small>Un cuadro por año vivido</small></span>
                        <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                    </summary>
                    <div className="mobile-acc-body">
                        <div className="mobile-lifemap">
                            {Array.from({ length: Math.min(game.config.maxAge, 105) }, (_, age) => {
                                return <span key={age} title={`${age} años`} className={`${age < c.age ? "lived" : ""} ${age === c.age ? "current" : ""}`} />;
                            })}
                        </div>
                        <p className="mobile-muted">El final no está escrito. Cada cuadro es un año que ya te pertenece.</p>
                    </div>
                </details>

                {latestTurn ? (
                    <details className="mobile-card mobile-accordion">
                        <summary>
                            <span className="mobile-acc-icon"><CircleDollarSign aria-hidden="true" /></span>
                            <span><strong>Balance del último año</strong><small>{latestTurn.year} · ingresos, gastos y decisiones</small></span>
                            <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                        </summary>
                        <div className="mobile-acc-body">
                            <YearEcho record={latestTurn} slot={game.me.slot} currency={c.currentCurrency} />
                        </div>
                    </details>
                ) : null}

                <details className="mobile-card mobile-accordion">
                    <summary>
                        <span className="mobile-acc-icon"><Wallet aria-hidden="true" /></span>
                        <span><strong>Mudanzas y proyectos</strong><small>Estudiar, trabajar o vivir fuera</small></span>
                        <ChevronDown className="mobile-acc-chevron" aria-hidden="true" />
                    </summary>
                    <div className="mobile-acc-body">
                        <p className="mobile-muted">Los proyectos internacionales se abren a los 17 años. Antes de mudarte, el juego revisa documentación, presupuesto y residencia.</p>
                        <button
                            type="button"
                            className="mobile-inline-action"
                            disabled={busy || c.age < 17}
                            onClick={onOpenMobility}
                        >
                            {c.age < 17 ? "Disponible a partir de los 17 años" : "Irme al extranjero"}
                        </button>
                    </div>
                </details>

                <footer className="mobile-footer">
                    <Sparkles aria-hidden="true" />
                    <p>LIFE DUEL <b>2.2</b><br /><span>La misma vida. Tus decisiones.</span></p>
                </footer>
            </main>
        </div>
    );
}
