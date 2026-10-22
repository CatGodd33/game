import { cn } from "../../lib/utils";

const exactFormatter = new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
});

export function formatUsd(value: number): string {
    return exactFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatUsdCompact(value: number): string {
    const absolute = Math.abs(value);
    return absolute >= 100_000 ? compactFormatter.format(value) : exactFormatter.format(value);
}

/**
 * Importe monetario que nunca empuja su contenedor. En espacios estrechos usa
 * notación compacta y conserva el valor exacto en el tooltip y para lectores
 * de pantalla.
 */
export function MoneyText({
    value,
    compact = false,
    className,
    suffix,
}: {
    value: number;
    compact?: boolean;
    className?: string;
    suffix?: string;
}) {
    const exact = formatUsd(value);
    return (
        <span
            className={cn("money-text", "tabular-nums", className)}
            title={`${exact} PPP${suffix ? ` ${suffix}` : ""}`}
            aria-label={`${exact} PPP${suffix ? ` ${suffix}` : ""}`}
        >
            {compact ? formatUsdCompact(value) : exact}
        </span>
    );
}
