import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Landmark } from "lucide-react";
import type { MonthlyStatement, Transaction } from "@life-duel/shared";
import {
    balanceAtProgress,
    buildMonthTimeline,
    money,
    monthShortName,
    monthTotalsAt,
    recentBankMovements,
    toBankMovement,
} from "../../features/bank/bankPresentation";
import {
    useAnimatedNumber,
    useMonthProgress,
    useReducedMotion,
} from "../../features/bank/useBankReplay";
import { BankMovementRow } from "./BankMovementRow";
import { MoneyText } from "../ui/MoneyText";

export function LiveLedger({
    statements,
    year,
    available,
    debt,
    live,
    paused,
    month = 0,
    transactions = [],
    deadlineAt,
    progressSeconds = 0,
    monthlyMode = false,
    historyHref,
    onDebtClick,
}: {
    statements?: MonthlyStatement[];
    year: number;
    available: number;
    debt: number;
    live: boolean;
    paused: boolean;
    month?: number;
    transactions?: Transaction[];
    deadlineAt?: string | null;
    progressSeconds?: number;
    monthlyMode?: boolean;
    historyHref: string;
    onDebtClick?: () => void;
}) {
    const statement = statements?.at(-1);
    const reducedMotion = useReducedMotion();
    const timeline = useMemo(
        () => buildMonthTimeline(transactions, statement, year),
        [transactions, statement, year],
    );
    const active = Boolean(monthlyMode && live && !paused && deadlineAt);
    const resetKey = timeline?.monthKey ?? `${year}-${month}`;
    const progress = useMonthProgress({
        deadlineAt,
        durationMs: Math.max(0, progressSeconds * 1000),
        active,
        resetKey,
        reducedMotion,
    });
    const revealProgress = Math.round(progress * 1000) / 1000;
    const rows = useMemo(
        () => recentBankMovements(transactions, timeline, revealProgress, 5),
        [transactions, timeline, revealProgress],
    );
    const target = timeline
        ? progress >= 0.999
            ? available
            : balanceAtProgress(timeline, progress)
        : available;
    const displayed = useAnimatedNumber(target, reducedMotion);
    const totals = timeline
        ? monthTotalsAt(timeline, progress)
        : { income: 0, expenses: 0 };
    const incomeSources = useMemo(() => {
        const source = timeline
            ? timeline.movements.filter((movement) => revealProgress + 0.0001 >= movement.at)
            : [...transactions].reverse().map((transaction) => toBankMovement(transaction));
        const unique = new Map<string, (typeof source)[number]>();
        for (const movement of source) {
            if (movement.direction !== "in") continue;
            if (!["salary", "business", "partner", "pension", "benefit"].includes(movement.category)) continue;
            if (!unique.has(movement.title)) unique.set(movement.title, movement);
        }
        if (unique.size === 0 && revealProgress >= 0.999 && statement?.incomeItems?.length) {
            return statement.incomeItems.slice(0, 2).map((item, index) => ({
                id: `statement-income-${index}`,
                title: item.label,
                value: item.amount,
            }));
        }
        return [...unique.values()].slice(0, 2);
    }, [timeline, transactions, revealProgress, statement]);
    const balanceText = money(displayed);
    const debtText = debt > 0 ? money(debt) : "Sin deuda";
    const longBalance = balanceText.replace(/\s/g, "").length > 9;
    const longDebt = debtText.replace(/\s/g, "").length > 9;
    const displayMonth = timeline?.month ?? (month > 0 ? month : 1);
    const monthStatus = !statement
        ? "Primer cierre pendiente"
        : paused && progress < 0.999
            ? "Cierre en pausa"
            : active && progress < 0.999
                ? "Cierre en curso"
                : "Mes cerrado";
    const statusLabel = paused ? "En pausa" : live ? "En directo" : "Decisión";
    const monthlyDebt = statement?.debtPayment ?? 0;
    const debtDetail = debt > 0
        ? monthlyDebt > 0
            ? `Cuota ${money(monthlyDebt)}`
            : "Deuda pendiente"
        : "Sin préstamos";

    return (
        <section className="live-ledger bank-v3" aria-label="Banco y cuenta personal">
            <header className="bank-v3-head">
                <div className="bank-v3-title">
                    <span className="bank-v3-mark" aria-hidden="true"><Landmark /></span>
                    <div>
                        <p>Cuenta personal · USD PPP</p>
                        <h2>Banco</h2>
                    </div>
                </div>
                <span className={`bank-v3-status ${live && !paused ? "on" : ""}`}>
                    <i aria-hidden="true" />
                    {statusLabel}
                </span>
            </header>

            <div className="bank-v3-overview">
                <div className="bank-v3-balance">
                    <span>Disponible ahora</span>
                    <strong className={longBalance ? "long" : undefined} aria-label={`Saldo disponible ${money(available)}`}><MoneyText value={displayed} compact={longBalance} /></strong>
                    <small>Saldo autoritativo al cerrar el mes</small>
                </div>
                <div className={`bank-v3-debt ${debt > 0 ? "has-debt" : ""}`}>
                    <span>Deuda</span>
                    <b className={longDebt ? "long" : undefined} aria-label={`Deuda pendiente ${money(debt)}`}><MoneyText value={debt} compact={longDebt} /></b>
                    <small>{debtDetail}</small>
                </div>
            </div>

            {onDebtClick ? <button type="button" className="bank-v3-debt-link" onClick={onDebtClick}>Ver todas mis deudas<span aria-hidden="true">→</span></button> : null}

            <div className="bank-v3-month">
                <div>
                    <strong>{monthShortName(displayMonth)} {timeline?.year ?? year}</strong>
                    <span aria-live="polite">{monthStatus}</span>
                </div>
                <div className="bank-v3-flows" aria-label="Resumen del cierre">
                    <span className="incoming">+{money(totals.income)}</span>
                    <span className="outgoing">−{money(totals.expenses)}</span>
                </div>
            </div>
            <div className="bank-v3-meter" aria-hidden="true">
                <i style={{ transform: `scaleX(${timeline ? Math.max(0, Math.min(1, progress)) : 0})` }} />
            </div>

            {incomeSources.length > 0 ? (
                <div className="bank-v3-sources" aria-label="Ingresos del cierre">
                    {incomeSources.map((movement) => (
                        <p key={movement.id}>
                            <span>{movement.title}</span>
                            <b>+{money(movement.value)}</b>
                        </p>
                    ))}
                </div>
            ) : null}

            <div className="bank-v3-feed-head">
                <h3>Últimos movimientos</h3>
                <span>{rows.length}/5 recientes</span>
            </div>
            {rows.length > 0 ? (
                <ul className="bank-v3-feed">
                    {rows.map((movement) => <BankMovementRow key={movement.id} movement={movement} />)}
                </ul>
            ) : (
                <p className="bank-v3-empty">
                    El primer ingreso o recibo aparecerá aquí cuando el servidor cierre el mes.
                </p>
            )}

            <div className="bank-v3-footer">
                <Link to={historyHref}>Ver historial completo <ArrowUpRight aria-hidden="true" /></Link>
                <p>Nómina al inicio · recibos durante el cierre · compras manuales al instante</p>
            </div>
        </section>
    );
}
