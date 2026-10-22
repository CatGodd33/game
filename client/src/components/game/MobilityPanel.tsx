import { useEffect, useMemo, useState } from "react";
import type {
    GameView,
    MobilityFamilyMode,
    MobilityOffer,
    MobilityPurpose,
    MobilityResponse,
} from "@life-duel/shared";
import { BriefcaseBusiness, GraduationCap, Home, Loader2, MapPin, Plane, ShieldAlert } from "lucide-react";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useToast } from "../ui/ToastProvider";
import { api } from "../../services/api";
import { safeErrorMessage } from "../../lib/utils";

const PURPOSES: { id: MobilityPurpose; label: string; icon: typeof GraduationCap }[] = [
    { id: "study", label: "Estudiar fuera", icon: GraduationCap },
    { id: "work", label: "Trabajar fuera", icon: BriefcaseBusiness },
    { id: "live", label: "Vivir fuera", icon: Home },
];

const FAMILY_MODES: { id: MobilityFamilyMode; label: string }[] = [
    { id: "solo", label: "Solo/a" },
    { id: "partner", label: "Con pareja" },
    { id: "family", label: "Con familia" },
];

function usd(value: number): string {
    return new Intl.NumberFormat("es", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);
}

function local(value: number, offer: MobilityOffer): string {
    try {
        return new Intl.NumberFormat("es", {
            style: "currency",
            currency: offer.currency.code,
            maximumFractionDigits: 0,
        }).format(value * offer.currency.localPerIntlDollar);
    } catch {
        return `${offer.currency.symbol}${Math.round(value * offer.currency.localPerIntlDollar).toLocaleString("es")}`;
    }
}

/**
 * Proyectos internacionales reales dentro del modelo: estudiar, trabajar o
 * vivir fuera. El servidor calcula costes, elegibilidad y resultado; esta
 * pantalla solo presenta la oferta y envía una intención.
 */
export function MobilityPanel({
    game,
    onGame,
    onClose,
}: {
    game: GameView;
    onGame: (game: GameView) => void;
    onClose: () => void;
}) {
    const toast = useToast();
    const [data, setData] = useState<MobilityResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [purpose, setPurpose] = useState<MobilityPurpose>("study");
    const [familyMode, setFamilyMode] = useState<MobilityFamilyMode>("solo");
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [showBlocked, setShowBlocked] = useState(false);

    useEffect(() => {
        let active = true;
        setLoading(true);
        api
            .mobility(game.id)
            .then((result) => {
                if (!active) return;
                setData(result);
                const first = result.offers.find((offer) => offer.purpose === "study" && offer.eligible);
                setSelectedId(first?.id ?? result.offers[0]?.id ?? null);
            })
            .catch((reason) => active && setError(safeErrorMessage(reason)))
            .finally(() => active && setLoading(false));
        return () => {
            active = false;
        };
    }, [game.id]);

    const offers = useMemo(
        () =>
            (data?.offers ?? []).filter(
                (offer) =>
                    offer.purpose === purpose &&
                    (offer.eligible || showBlocked) &&
                    (familyMode === "solo" || offer.familyCosts.some((cost) => cost.mode === familyMode)),
            ),
        [data, purpose, familyMode, showBlocked],
    );
    const selected = useMemo(
        () => data?.offers.find((offer) => offer.id === selectedId) ?? offers[0] ?? null,
        [data, selectedId, offers],
    );
    const family = selected?.familyCosts.find((cost) => cost.mode === familyMode) ?? selected?.familyCosts[0] ?? null;

    const confirm = async () => {
        if (!selected || !family || busy) return;
        setBusy(true);
        try {
            const result = await api.move(game.id, {
                optionId: selected.id,
                familyMode,
                idempotencyKey: crypto.randomUUID(),
            });
            onGame(result.game);
            toast.push(result.message, result.success ? "success" : "info");
            if (result.success) onClose();
        } catch (reason) {
            toast.push(safeErrorMessage(reason), "error");
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            title="Irte al extranjero"
            description="Estudiar, trabajar o empezar de nuevo en otro país. Los importes son presupuestos de simulación en USD PPP; no son tarifas oficiales."
            size="lg"
            dismissible={!busy}
        >
            {loading ? (
                <div className="flex items-center gap-2 p-8 text-sm text-parchment-dim">
                    <Loader2 className="h-4 w-4 animate-spin text-gold" /> Calculando vuelos, visados y vida en destino…
                </div>
            ) : error ? (
                <div className="rounded-xl border border-rose/20 bg-rose/[0.05] p-4 text-sm text-rose">{error}</div>
            ) : data && data.offers.length === 0 ? (
                <p className="p-6 text-sm text-parchment-dim">No hay destinos disponibles en este momento.</p>
            ) : data ? (
                <div className="space-y-5">
                    <div className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-4">
                        <p className="flex items-center gap-2 text-sm text-parchment">
                            <MapPin className="h-4 w-4 text-gold" />
                            Ahora estás en <strong>{data.currentLocation}</strong>. Disponible: <strong>{usd(data.money)}</strong>.
                        </p>
                        <p className="mt-1 text-[0.68rem] leading-relaxed text-parchment-faint">
                            Mudarte cambia tu residencia y tu moneda local, no tu país de nacimiento. La vida que
                            ya viviste no se borra. La pareja o los hijos pueden quedarse, acompañarte o viajar
                            contigo; cada decisión tiene un coste y una consecuencia.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {PURPOSES.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={purpose === item.id}
                                    onClick={() => {
                                        setPurpose(item.id);
                                        setSelectedId(
                                            data.offers.find((offer) => offer.purpose === item.id && offer.eligible)?.id ??
                                            data.offers.find((offer) => offer.purpose === item.id)?.id ??
                                            null,
                                        );
                                    }}
                                    className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${purpose === item.id
                                            ? "border-gold/40 bg-gold/10 text-gold-soft"
                                            : "border-white/10 text-parchment-dim hover:text-parchment"
                                        }`}
                                >
                                    <Icon className="h-3.5 w-3.5" /> {item.label}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            onClick={() => setShowBlocked((current) => !current)}
                            className="ml-auto text-[0.65rem] text-parchment-faint underline decoration-dotted underline-offset-4 hover:text-parchment"
                        >
                            {showBlocked ? "Ocultar destinos no disponibles" : "Ver también los no disponibles"}
                        </button>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                        <div className="max-h-[26rem] space-y-2 overflow-y-auto pr-1" role="listbox" aria-label="Destinos">
                            {offers.length === 0 ? (
                                <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-parchment-faint">
                                    No hay destinos que cumplan estos requisitos. Prueba otra modalidad familiar o
                                    revisa tu educación y ahorros.
                                </p>
                            ) : (
                                offers.map((offer) => {
                                    const cost = offer.familyCosts.find((entry) => entry.mode === familyMode) ?? offer.familyCosts[0]!;
                                    return (
                                        <button
                                            key={offer.id}
                                            type="button"
                                            role="option"
                                            aria-selected={selected?.id === offer.id}
                                            onClick={() => setSelectedId(offer.id)}
                                            className={`w-full rounded-xl border p-3 text-left transition ${selected?.id === offer.id
                                                    ? "border-gold/40 bg-gold/[0.06]"
                                                    : "border-white/10 bg-white/[0.018] hover:border-gold/25"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <p className="text-sm font-medium text-parchment">{offer.countryName}</p>
                                                    <p className="mt-0.5 text-[0.65rem] text-parchment-faint">
                                                        {offer.city} · {offer.currency.code}
                                                    </p>
                                                </div>
                                                <Badge tone={offer.eligible && !cost.blockedReason ? "jade" : "amber"}>
                                                    {offer.eligible && !cost.blockedReason ? `${offer.successChance}%` : "No disponible"}
                                                </Badge>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-2 text-[0.65rem]">
                                                <span className="text-parchment-dim">{usd(cost.total)}</span>
                                                <span className="text-parchment-faint">≈ {local(cost.total, offer)}</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {selected && family ? (
                            <div className="rounded-2xl border border-white/10 bg-ink-950/40 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                        <p className="text-[0.62rem] uppercase tracking-[0.14em] text-gold-soft">
                                            {selected.purposeLabel}
                                        </p>
                                        <h3 className="mt-1 text-xl text-parchment">
                                            {selected.city}, {selected.countryName}
                                        </h3>
                                        <p className="mt-1 flex items-center gap-1 text-[0.65rem] text-parchment-faint">
                                            <Plane className="h-3 w-3" /> Vuelo estimado {usd(selected.flight)} · vida mensual {usd(selected.monthlyLiving)}
                                        </p>
                                    </div>
                                    <Badge tone={selected.eligible ? "jade" : "amber"}>
                                        Éxito orientativo {selected.successChance}%
                                    </Badge>
                                </div>

                                <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Modalidad familiar">
                                    {FAMILY_MODES.map((mode) => (
                                        <button
                                            key={mode.id}
                                            type="button"
                                            aria-pressed={familyMode === mode.id}
                                            onClick={() => setFamilyMode(mode.id)}
                                            className={`rounded-lg border px-2.5 py-1.5 text-[0.65rem] transition ${familyMode === mode.id
                                                    ? "border-jade/35 bg-jade/10 text-jade"
                                                    : "border-white/10 text-parchment-faint hover:text-parchment"
                                                }`}
                                        >
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-3 space-y-1.5 border-t border-white/[0.07] pt-3">
                                    {family.lines.map((line, index) => (
                                        <div key={`${line.concept}-${index}`} className="flex items-baseline justify-between gap-3 text-[0.68rem]">
                                            <span className="text-parchment-dim">{line.concept}</span>
                                            <span className="shrink-0 tabular-nums text-parchment">{usd(line.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-baseline justify-between gap-3 border-t border-white/[0.07] pt-2 text-xs">
                                        <span className="font-semibold text-parchment">Total</span>
                                        <span className="text-right">
                                            <strong className="block text-base text-gold-soft">{usd(family.total)}</strong>
                                            <small className="text-parchment-faint">≈ {local(family.total, selected)}</small>
                                        </span>
                                    </div>
                                </div>

                                {family.blockedReason ? (
                                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber/20 bg-amber/[0.06] p-2.5 text-[0.68rem] text-amber">
                                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {family.blockedReason}
                                    </p>
                                ) : null}
                                {selected.blockedReason && !family.blockedReason ? (
                                    <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber/20 bg-amber/[0.06] p-2.5 text-[0.68rem] text-amber">
                                        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {selected.blockedReason}
                                    </p>
                                ) : null}

                                <div className="mt-3 space-y-1 text-[0.65rem] leading-relaxed text-parchment-faint">
                                    {selected.requirements.map((requirement) => (
                                        <p key={requirement}>· {requirement}</p>
                                    ))}
                                    {selected.warnings.map((warning) => (
                                        <p key={warning} className="text-parchment-faint/80">· {warning}</p>
                                    ))}
                                </div>

                                <Button
                                    variant="primary"
                                    className="mt-4 w-full"
                                    onClick={() => void confirm()}
                                    loading={busy}
                                    disabled={!selected.eligible || Boolean(family.blockedReason)}
                                >
                                    {selected.purpose === "study"
                                        ? "Solicitar plaza y mudarme"
                                        : selected.purpose === "work"
                                            ? "Aceptar el proyecto y mudarme"
                                            : "Empezar una vida allí"}
                                </Button>
                                <p className="mt-2 text-center text-[0.6rem] text-parchment-faint">
                                    El servidor valida la solicitud y registra el resultado. La visa puede ser rechazada.
                                </p>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </Modal>
    );
}
