import {
    ArrowLeftRight,
    BriefcaseBusiness,
    Building2,
    CarFront,
    CreditCard,
    Droplets,
    Flame,
    GraduationCap,
    HandCoins,
    HeartPulse,
    House,
    Landmark,
    PawPrint,
    ReceiptText,
    ShoppingBasket,
    Wifi,
    Zap,
} from "lucide-react";
import type { BankMovementView } from "../../features/bank/bankPresentation";
import { money, monthShortName } from "../../features/bank/bankPresentation";

function iconFor(movement: BankMovementView) {
    const label = movement.title.toLocaleLowerCase("es");
    switch (movement.category) {
        case "salary":
            return BriefcaseBusiness;
        case "business":
            return Building2;
        case "partner":
            return HandCoins;
        case "pension":
        case "benefit":
            return Landmark;
        case "housing":
            return House;
        case "utilities":
            if (/agua/.test(label)) return Droplets;
            if (/gas|calefacc/.test(label)) return Flame;
            if (/internet|teléfono|telefono/.test(label)) return Wifi;
            return Zap;
        case "food":
            return ShoppingBasket;
        case "transport":
            return CarFront;
        case "health":
            return HeartPulse;
        case "education":
            return GraduationCap;
        case "tax":
            return ReceiptText;
        case "debt":
            return CreditCard;
        case "pet":
            return PawPrint;
        case "transfer":
            return ArrowLeftRight;
        default:
            return Landmark;
    }
}

function signedValue(movement: BankMovementView): string {
    if (movement.direction === "in") return `+${money(movement.value)}`;
    if (movement.direction === "out") return `−${money(movement.value)}`;
    const sign = movement.debtDelta >= 0 ? "+" : "−";
    return `${sign}${money(movement.value)}`;
}

export function BankMovementRow({ movement }: { movement: BankMovementView }) {
    const Icon = iconFor(movement);
    const debt = movement.category === "debt";
    const direction = debt ? "debt" : movement.direction;
    const value = signedValue(movement);
    const date = movement.month ? monthShortName(movement.month) : "";

    return (
        <li
            className={`bank-v3-row ${direction}`}
            aria-label={`${movement.title}. ${movement.detail}. ${value}`}
        >
            <span className="bank-v3-icon" aria-hidden="true"><Icon /></span>
            <div className="bank-v3-copy">
                <strong title={movement.title}>{movement.title}</strong>
                <small>{movement.detail}{date ? ` · ${date}` : ""}</small>
            </div>
            <div className="bank-v3-amount">
                <b>{value}</b>
                {debt ? <small>{movement.debtDelta >= 0 ? "Deuda" : "Cuota"}</small> : null}
            </div>
        </li>
    );
}
