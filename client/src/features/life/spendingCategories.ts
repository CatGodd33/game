import type { SpendingOption } from "@life-duel/shared";

export type SpendingCategory = SpendingOption["category"];

/** Etiquetas visibles del catálogo económico. */
export const SPENDING_CATEGORY_LABELS: Record<SpendingCategory, string> = {
    bienestar: "Vivir mejor",
    educacion: "Estudios e idiomas",
    familia: "Familia",
    animales: "Animales",
    patrimonio: "Comprar y vender",
    empresa: "Mi empresa",
    finanzas: "Dinero e inversión",
};

/**
 * La infancia no debe ver productos financieros ni dirección de empresas.
 * El servidor vuelve a validar cada compra: esto solo evita opciones imposibles
 * en la interfaz.
 */
export function spendingCategoriesForAge(age: number): SpendingCategory[] {
    const all = Object.keys(SPENDING_CATEGORY_LABELS) as SpendingCategory[];
    if (age >= 18) return all;
    return all.filter((category) => category !== "empresa" && category !== "finanzas");
}

/** Una opción bloqueada por edad no se muestra a menores. */
export function spendingOptionVisible(option: SpendingOption, age: number): boolean {
    if (age >= 18) return true;
    if (option.blocked === "Disponible al cumplir 18 años" || option.blocked === "Disponible desde los 18 años") {
        return false;
    }
    return option.category !== "empresa" && option.category !== "finanzas";
}
