import { useRef, useState } from "react";
import { Flower2, HandHeart, Landmark } from "lucide-react";
import type { FuneralChoice, GameView } from "@life-duel/shared";
import { api } from "../../services/api";
import { safeErrorMessage } from "../../lib/utils";
import { Modal } from "../ui/Modal";
import { MoneyText } from "../ui/MoneyText";
import { useToast } from "../ui/ToastProvider";

export function funeralPrice(base: number, choice: FuneralChoice): number {
    if (choice === "intima") return Math.max(80, Math.round(base * 0.65));
    if (choice === "grande") return Math.max(150, Math.round(base * 1.8));
    return 0;
}

/**
 * Despedida de un familiar. El servidor no cobra nada hasta que el jugador
 * elige; aquí solo se muestra una estimación y se envía la intención.
 */
export function FuneralPanel({
    game,
    onGame,
    onClose,
}: {
    game: GameView;
    onGame: (game: GameView) => void;
    onClose: () => void;
}) {
    const character = game.me.character;
    const funeral = character.pendingFunerals?.[0];
    const toast = useToast();
    const [choice, setChoice] = useState<FuneralChoice>("intima");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const retry = useRef<{ body: string; key: string } | null>(null);
    const [queueVersion] = useState(() => character.pendingFunerals?.length ?? 0);

    if (!funeral) return null;
    const options: { id: FuneralChoice; title: string; description: string; icon: typeof Flower2 }[] = [
        {
            id: "intima",
            title: "Ceremonia íntima",
            description: "Reunir a las personas más cercanas, sin ostentación. Un cierre sereno y un coste contenido.",
            icon: HandHeart,
        },
        {
            id: "grande",
            title: "Despedida a lo grande",
            description: "Una ceremonia amplia para honrar su memoria y acompañar a la familia. Puede mejorar el apoyo recibido, pero pesa en el presupuesto.",
            icon: Flower2,
        },
        {
            id: "sin_ceremonia",
            title: "Sin ceremonia",
            description: "No destinar dinero a una despedida. Evita el gasto inmediato, aunque puede aumentar el aislamiento y el remordimiento.",
            icon: Landmark,
        },
    ];
    const currentFuneral = funeral;
    const cost = funeralPrice(currentFuneral.baseCost, choice);
    const debtPart = character.age >= 18 ? Math.max(0, cost - Math.max(0, character.finance.money)) : 0;

    async function resolve() {
        if (busy) return;
        const body = JSON.stringify({ funeralId: currentFuneral.id, choice });
        if (retry.current?.body !== body) retry.current = { body, key: crypto.randomUUID() };
        setBusy(true);
        setError("");
        try {
            const result = await api.funeral(game.id, {
                funeralId: currentFuneral.id,
                choice,
                idempotencyKey: retry.current.key,
            });
            onGame(result.game);
            toast.push(result.message, "success");
            retry.current = null;
            if (!result.game.me.character.pendingFunerals?.length) onClose();
        } catch (reason) {
            setError(safeErrorMessage(reason));
        } finally {
            setBusy(false);
        }
    }

    return (
        <Modal open onClose={onClose} title="Una despedida" description={`${funeral.relativeName} (${funeral.relationship}) ha muerto. La familia espera una decisión sobre el funeral; todavía no se ha cargado ningún gasto.`} size="lg">
            <div className="funeral-panel">
                {queueVersion > 1 ? <p className="funeral-queue">Hay {queueVersion} despedidas pendientes. Resolverás una cada vez.</p> : null}
                <div className="funeral-options" role="radiogroup" aria-label="Tipo de despedida">
                    {options.map((option) => {
                        const Icon = option.icon;
                        const optionCost = funeralPrice(funeral.baseCost, option.id);
                        return (
                            <button
                                key={option.id}
                                type="button"
                                role="radio"
                                aria-checked={choice === option.id}
                                className={`funeral-option ${choice === option.id ? "selected" : ""}`}
                                onClick={() => setChoice(option.id)}
                            >
                                <Icon aria-hidden="true" />
                                <span>
                                    <b>{option.title}</b>
                                    <small>{option.description}</small>
                                    <em>{optionCost > 0 ? <><MoneyText value={optionCost} /> · </> : "Sin coste · "}{character.age < 18 ? "lo asume el hogar" : optionCost === 0 ? "sin gasto" : "desde tu saldo o deuda"}</em>
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="funeral-summary">
                    <div><span>Coste estimado</span><strong><MoneyText value={cost} /></strong></div>
                    <div><span>Saldo disponible</span><strong><MoneyText value={character.finance.money} /></strong></div>
                    {debtPart > 0 ? <p><Landmark aria-hidden="true" /> {character.age < 18 ? "El hogar cubre el gasto." : <>Faltan <MoneyText value={debtPart} /> que se añadirán a la deuda.</>}</p> : null}
                </div>
                {error ? <p className="funeral-error" role="alert">{error}</p> : null}
                <div className="funeral-actions">
                    <button className="story-button primary" disabled={busy} onClick={() => void resolve()}>{busy ? "Registrando despedida…" : "Confirmar despedida"}</button>
                    <button className="story-button" disabled={busy} onClick={onClose}>Decidir más tarde</button>
                </div>
                <p className="funeral-footnote">La elección queda en tu historial privado. Si hay más funerales pendientes, podrás resolverlos después. La simulación no cobra nada por tu cuenta.</p>
            </div>
        </Modal>
    );
}
