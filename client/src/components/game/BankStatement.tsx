import type { MonthlyStatement } from "@life-duel/shared";
import { ArrowDownRight, ArrowUpRight, Banknote, CalendarDays, ReceiptText } from "lucide-react";

const money = (value: number) =>
    new Intl.NumberFormat("es", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const CATEGORY_LABELS: { key: keyof MonthlyStatement; label: string }[] = [
    { key: "housing", label: "Vivienda" },
    { key: "food", label: "Comida" },
    { key: "utilities", label: "Luz, agua e internet" },
    { key: "transport", label: "Transporte" },
    { key: "health", label: "Salud" },
    { key: "education", label: "Educación" },
    { key: "other", label: "Otros" },
];

/**
 * Extracto bancario del año. Es una vista de solo lectura: los importes
 * vienen del servidor y el cliente no puede alterarlos.
 */
export function BankStatement({ statements, year }: { statements?: MonthlyStatement[]; year: number }) {
    if (!statements?.length) {
        return (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-sm text-parchment-dim">
                <p className="flex items-center gap-2 font-medium text-parchment">
                    <Banknote className="h-4 w-4 text-gold" /> Extracto bancario
                </p>
                <p className="mt-2 text-xs leading-relaxed">
                    El primer año aún no genera un extracto personal. Al resolver una edad aparecerán aquí
                    los doce meses con ingresos, gastos inevitables y deuda.
                </p>
            </div>
        );
    }

    const income = statements.reduce((sum, month) => sum + month.income, 0);
    const expenses = statements.reduce(
        (sum, month) =>
            sum + month.taxes + month.housing + month.food + month.utilities + month.transport +
            month.health + month.education + month.other + month.debtPayment,
        0,
    );
    const net = income - expenses;
    const last = statements[statements.length - 1];
    const largest = [...statements].sort(
        (a, b) =>
            (b.housing + b.food + b.utilities + b.other) -
            (a.housing + a.food + a.utilities + a.other),
    )[0];

    return (
        <section className="bank-statement" aria-labelledby="bank-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="eyebrow mb-1">Banco · {year}</p>
                    <h3 id="bank-title" className="flex items-center gap-2 text-xl text-parchment">
                        <ReceiptText className="h-5 w-5 text-gold" /> Tu año, mes a mes
                    </h3>
                    <p className="mt-1 max-w-xl text-xs leading-relaxed text-parchment-dim">
                        Gastos inevitables y estacionales. La vivienda incluye alquiler o hipoteca estimada;
                        las facturas de luz y agua suben en invierno y verano.
                    </p>
                </div>
                <div className={`rounded-xl border px-3 py-2 text-right ${net >= 0 ? "border-jade/25 bg-jade/5" : "border-rose/25 bg-rose/5"}`}>
                    <p className="text-[0.6rem] uppercase tracking-[0.12em] text-parchment-faint">Balance del año</p>
                    <p className={`mt-0.5 flex items-center justify-end gap-1 text-lg font-medium ${net >= 0 ? "text-jade" : "text-rose"}`}>
                        {net >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {money(net)}
                    </p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="bank-kpi"><span>Ingresos</span><b>{money(income)}</b></div>
                <div className="bank-kpi"><span>Gastos</span><b>{money(expenses)}</b></div>
                <div className="bank-kpi"><span>Saldo final</span><b>{money(last?.balance ?? 0)}</b></div>
                <div className="bank-kpi"><span>Deuda</span><b>{money(last?.debt ?? 0)}</b></div>
            </div>

            <details className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-3 text-xs text-parchment">
                    <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gold" /> Ver los 12 meses y sus categorías
                    </span>
                    <span className="text-[0.62rem] text-parchment-faint">El mes más caro: {largest ? MONTHS[largest.month - 1] : "—"}</span>
                </summary>
                <div className="overflow-x-auto border-t border-white/[0.06]">
                    <table className="bank-table">
                        <thead>
                            <tr>
                                <th scope="col">Mes</th>
                                <th scope="col">Ingresos</th>
                                <th scope="col">Impuestos</th>
                                {CATEGORY_LABELS.map(({ key, label }) => <th key={key} scope="col">{label}</th>)}
                                <th scope="col">Deuda</th>
                                <th scope="col">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statements.map((month) => (
                                <tr key={month.month}>
                                    <th scope="row">{MONTHS[month.month - 1]}{month.note ? <small>{month.note}</small> : null}</th>
                                    <td className="text-jade">{money(month.income)}</td>
                                    <td>{money(month.taxes)}</td>
                                    {CATEGORY_LABELS.map(({ key }) => <td key={key}>{money(Number(month[key]) || 0)}</td>)}
                                    <td>{money(month.debtPayment)}</td>
                                    <td className={month.balance >= 0 ? "text-parchment" : "text-rose"}>{money(month.balance)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </section>
    );
}
