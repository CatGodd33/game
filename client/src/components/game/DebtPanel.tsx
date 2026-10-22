import { useMemo, useRef, useState } from "react";
import { Landmark, ShieldAlert, Wallet } from "lucide-react";
import type { GameView } from "@life-duel/shared";
import { api } from "../../services/api";
import { safeErrorMessage } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import { MoneyText } from "../ui/MoneyText";
import { useToast } from "../ui/ToastProvider";

interface DebtRow {
    key: string;
    targetId: string;
    kind: "loan" | "mortgage" | "other";
    label: string;
    detail: string;
    balance: number;
    interest?: number;
    monthly?: number;
}

const lenderLabel: Record<string, string> = {
    banco: "Banco",
    familia: "Familia",
    empresa: "Empresa",
};

/**
 * Vista de deuda construida a partir del estado autoritativo del servidor.
 * Las filas se concilian con `finance.debt`; si una partida antigua no está
 * vinculada a un préstamo o hipoteca, se muestra como deuda residual.
 */
export function DebtPanel({
    game,
    onGame,
    onClose,
}: {
    game: GameView;
    onGame: (game: GameView) => void;
    onClose: () => void;
}) {
    const character = game.me.character;
    const toast = useToast();
    const [selected, setSelected] = useState<string | null>(null);
    const [amount, setAmount] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const retry = useRef<{ body: string; key: string } | null>(null);

    const rows = useMemo<DebtRow[]>(() => {
        const total = Math.max(0, character.finance.debt);
        let remaining = total;
        const result: DebtRow[] = [];
        for (const loan of character.loans ?? []) {
            if (!loan.active || loan.balance <= 0 || remaining <= 0.01) continue;
            const balance = Math.min(loan.balance, remaining);
            remaining = Math.round((remaining - balance) * 100) / 100;
            result.push({
                key: loan.id,
                targetId: `loan:${loan.id}`,
                kind: "loan",
                label: loan.label,
                detail: `${lenderLabel[loan.lender] ?? loan.lender}${loan.creditorRelativeName ? ` · ${loan.creditorRelativeName}` : ""} · desde ${loan.originYear}`,
                balance,
                interest: loan.annualInterestRate,
            });
        }
        for (const asset of character.assets ?? []) {
            if (!asset.loanBalance || asset.loanBalance <= 0 || remaining <= 0.01) continue;
            const balance = Math.min(asset.loanBalance, remaining);
            remaining = Math.round((remaining - balance) * 100) / 100;
            result.push({
                key: asset.id,
                targetId: `asset:${asset.id}`,
                kind: "mortgage",
                label: `Hipoteca · ${asset.name}`,
                detail: `${asset.location ?? asset.country ?? character.currentCountry}${asset.loanRate ? ` · ${(asset.loanRate * 100).toFixed(1)} % anual` : ""}`,
                balance,
                interest: asset.loanRate,
                monthly: asset.monthlyPayment,
            });
        }
        if (remaining > 0.01) {
            result.push({
                key: "other",
                targetId: "other",
                kind: "other",
                label: "Otros cargos pendientes",
                detail: "Deuda sin un préstamo activo asociado: facturas, salud o gastos del hogar.",
                balance: remaining,
            });
        }
        return result;
    }, [character]);

    const totalDebt = Math.max(0, character.finance.debt);
    const monthly = rows.reduce((sum, row) => sum + (row.monthly ?? 0), 0);
    const active = rows.find((row) => row.key === selected) ?? null;

    function choose(row: DebtRow) {
        setSelected(row.key);
        setAmount(String(Math.max(1, Math.round(row.balance * 100) / 100)));
        setError("");
    }

    async function pay() {
        if (!active || busy) return;
        const numeric = Math.round(Number(amount) * 100) / 100;
        if (!Number.isFinite(numeric) || numeric <= 0) {
            setError("Indica un importe positivo.");
            return;
        }
        if (numeric > character.finance.money + 0.001) {
            setError("No tienes saldo suficiente para ese pago. Reduce el importe.");
            return;
        }
        if (numeric > active.balance + 0.001) {
            setError("El pago supera el saldo pendiente de esta deuda.");
            return;
        }
        const body = JSON.stringify({ action: "repay-debt", targetId: active.targetId, amount: numeric });
        if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
        setBusy(true);
        setError("");
        try {
            const result = await api.purchase(game.id, {
                action: "repay-debt",
                targetId: active.targetId,
                amount: numeric,
                idempotencyKey: retry.current.key,
            });
            onGame(result.game);
            setNotice(result.message);
            toast.push(result.message, "success");
            setSelected(null);
            setAmount("");
            retry.current = null;
        } catch (reason) {
            setError(safeErrorMessage(reason));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal open onClose={onClose} title="Tus deudas" description="Cada pago se valida en el servidor y queda registrado en el banco. Importes en dólares PPP." size="lg">
            <div className="debt-panel">
                <div className="debt-summary">
                    <div>
                        <span>Deuda total</span>
                        <strong><MoneyText value={totalDebt} /></strong>
                    </div>
                    <div>
                        <span>Disponible para pagar</span>
                        <strong><MoneyText value={character.finance.money} /></strong>
                    </div>
                    <div>
                        <span>Cuotas hipotecarias</span>
                        <strong>{monthly > 0 ? <MoneyText value={monthly} suffix="/mes" /> : "—"}</strong>
                    </div>
                </div>
                {notice ? <p className="debt-notice" role="status">{notice}</p> : null}

                {rows.length === 0 ? (
                    <div className="debt-empty">
                        <ShieldAlert aria-hidden="true" />
                        <h3>No tienes deudas registradas</h3>
                        <p>Las facturas, préstamos e hipotecas aparecerán aquí. Un crédito familiar condonado desaparece al morir la persona que lo prestó.</p>
                    </div>
                ) : (
                    <ul className="debt-list" aria-label="Deudas activas">
                        {rows.map((row) => (
                            <li key={row.key} className={`debt-row ${selected === row.key ? "selected" : ""}`}>
                                <div className="debt-row-head">
                                    <span className="debt-row-icon" aria-hidden="true">
                                        {row.kind === "mortgage" ? <Landmark /> : <Wallet />}
                                    </span>
                                    <div className="debt-row-copy">
                                        <h3>{row.label}</h3>
                                        <p>{row.detail}</p>
                                    </div>
                                    <div className="debt-row-amount">
                                        <span>Pendiente</span>
                                        <b><MoneyText value={row.balance} compact={row.balance >= 1_000_000} /></b>
                                        {row.monthly ? <small><MoneyText value={row.monthly} />/mes</small> : null}
                                    </div>
                                    <button className="story-button" onClick={() => choose(row)}>Pagar</button>
                                </div>
                                {selected === row.key ? (
                                    <div className="debt-pay">
                                        <label>
                                            Importe a pagar (PPP)
                                            <input
                                                type="number"
                                                min="1"
                                                max={row.balance}
                                                step="0.01"
                                                value={amount}
                                                onChange={(event) => setAmount(event.target.value)}
                                                autoFocus
                                            />
                                        </label>
                                        <div className="debt-pay-actions">
                                            <button className="story-button" disabled={busy} onClick={() => setAmount(String(row.balance))}>Pagar todo</button>
                                            <button className="story-button primary" disabled={busy} onClick={() => void pay()}>{busy ? "Registrando…" : "Confirmar pago"}</button>
                                            <button className="story-button" disabled={busy} onClick={() => { setSelected(null); setError(""); }}>Cancelar</button>
                                        </div>
                                        {error ? <p className="debt-error" role="alert">{error}</p> : null}
                                    </div>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}

                <p className="debt-footnote">
                    La deuda total se concilia con el banco. Pagar no mejora directamente tu puntuación: reduce la presión financiera y los intereses futuros.
                </p>
            </div>
        </Modal>
    );
}
