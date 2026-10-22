import type { BirthDetails, HouseholdState, ParentDetails } from "@life-duel/shared";
import { educationLabel } from "@life-duel/shared";

const money = (value: number) =>
    new Intl.NumberFormat("es", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);

const TENURE_LABEL: Record<HouseholdState["housingTenure"], string> = {
    propiedad: "Vivienda en propiedad",
    hipoteca: "Vivienda con hipoteca",
    alquiler: "Vivienda alquilada",
    compartida: "Vivienda compartida",
    informal: "Vivienda precaria",
};

const MARRIAGE_LABEL: Record<HouseholdState["context"]["marriageSystem"], string> = {
    "monogamia-legal": "Matrimonio monógamo legal",
    monogamia: "Matrimonio monógamo",
    "poligamia-legal": "Poligamia legal para este contexto",
    "poligamia-consuetudinaria": "Poligamia consuetudinaria",
    "poligamia-restringida": "Poligamia restringida por ley",
};

function ParentCard({ role, parent }: { role: "Madre" | "Padre"; parent: ParentDetails }) {
    const income = parent.annualIncome ?? 0;
    return (
        <article className="birth-parent-card">
            <header>
                <span>{role}</span>
                <b>{parent.name}</b>
                <small>{parent.inHousehold === false ? "Fuera del hogar" : "Vive en el hogar"}</small>
            </header>
            <dl>
                <div>
                    <dt>Edad</dt>
                    <dd>{parent.age} años</dd>
                </div>
                <div>
                    <dt>Oficio</dt>
                    <dd>{parent.occupation || "Sin actividad registrada"}</dd>
                </div>
                <div>
                    <dt>Educación</dt>
                    <dd>{parent.education ? educationLabel(parent.education) : "No registrada"}</dd>
                </div>
                <div>
                    <dt>{parent.incomeIsSupport ? "Aporta al hogar" : "Ingreso anual"}</dt>
                    <dd>
                        {money(income)} <small>PPP</small>
                    </dd>
                </div>
                <div>
                    <dt>Salud estimada</dt>
                    <dd>
                        <span className="birth-health-track" aria-hidden="true">
                            <i style={{ width: `${parent.health ?? 65}%` }} />
                        </span>
                        <span className="sr-only">Salud estimada: {parent.health ?? 65} de 100.</span>
                        {parent.health ?? 65}/100
                    </dd>
                </div>
            </dl>
            {parent.incomeIsSupport ? (
                <p className="birth-parent-note">
                    Esta cantidad es una aportación desde fuera del hogar, no un salario cotidiano dentro de la casa.
                </p>
            ) : null}
        </article>
    );
}

export function BirthHousehold({ details }: { details: BirthDetails }) {
    const household = details.household;
    if (!household) return null;
    const { budget, context, support } = household;
    const expenseShare = Math.min(100, Math.round((budget.annualExpenses / Math.max(1, budget.annualIncome)) * 100));
    const additional = household.additionalMembers.filter((member) => member.alive !== false);

    return (
        <section className="birth-household" aria-labelledby="birth-household-title">
            <div className="birth-household-heading">
                <div>
                    <p className="story-eyebrow">El hogar donde creces</p>
                    <h2 id="birth-household-title">{household.structureLabel}</h2>
                </div>
                <div className="birth-household-tags">
                    <span>{TENURE_LABEL[household.housingTenure]}</span>
                    <span>{money(details.annualHouseholdIncome)} PPP al año</span>
                </div>
            </div>

            <div className="birth-parents">
                <ParentCard role="Madre" parent={details.mother} />
                <ParentCard role="Padre" parent={details.father} />
            </div>

            {additional.length > 0 ? (
                <div className="birth-household-members">
                    <p className="story-eyebrow">También viven en casa</p>
                    <div>
                        {additional.map((member) => (
                            <span key={member.id}>
                                <b>{member.name}</b>
                                {member.role} · {member.age} años
                                {member.annualIncome ? ` · ${money(member.annualIncome)} PPP` : ""}
                            </span>
                        ))}
                    </div>
                </div>
            ) : null}

            <div className="birth-household-grid">
                <div className="birth-budget">
                    <div className="birth-budget-heading">
                        <p className="story-eyebrow">Presupuesto anual del hogar</p>
                        <span>{money(budget.annualIncome)} PPP de ingresos</span>
                    </div>
                    <div
                        className="birth-budget-bar"
                        role="img"
                        aria-label={`Los gastos equivalen al ${expenseShare} % de los ingresos anuales del hogar.`}
                    >
                        <i style={{ width: `${expenseShare}%` }} />
                    </div>
                    <div className="birth-budget-legend">
                        <span>Gastos {expenseShare} %</span>
                        <span>Margen {Math.max(0, 100 - expenseShare)} %</span>
                    </div>
                    <dl className="birth-budget-list">
                        <div>
                            <dt>Gastos esenciales</dt>
                            <dd>{money(budget.annualExpenses)}</dd>
                        </div>
                        <div>
                            <dt>Vivienda</dt>
                            <dd>{money(budget.housingCost)}</dd>
                        </div>
                        <div>
                            <dt>Alimentación</dt>
                            <dd>{money(budget.foodCost)}</dd>
                        </div>
                        <div>
                            <dt>Educación y salud</dt>
                            <dd>{money(budget.educationCost + budget.healthCost)}</dd>
                        </div>
                        <div>
                            <dt>Impuestos simplificados</dt>
                            <dd>{money(budget.taxes)}</dd>
                        </div>
                        <div className="birth-budget-result">
                            <dt>Margen disponible</dt>
                            <dd>{money(budget.disposableIncome)}</dd>
                        </div>
                        <div>
                            <dt>Ahorros</dt>
                            <dd>{money(budget.savings)}</dd>
                        </div>
                        <div>
                            <dt>Deudas</dt>
                            <dd>{money(budget.debt)}</dd>
                        </div>
                    </dl>
                </div>

                <div className="birth-household-side">
                    <div className="birth-context">
                        <p className="story-eyebrow">Contexto cultural modelado</p>
                        <p>
                            <b>{household.religion}</b> · religiosidad estimada {household.religiosity}/100
                        </p>
                        <p>{MARRIAGE_LABEL[context.marriageSystem]}</p>
                        <p>
                            Participación laboral femenina de referencia: {context.femaleLaborParticipationPct} % · brecha
                            salarial modelada: {context.genderWageGapPct} %
                        </p>
                        <p className="story-muted">
                            {context.provisional
                                ? "Parámetros provisionales de simulación, no estadísticas oficiales del país."
                                : "Parámetros del conjunto de datos del proyecto."}
                        </p>
                    </div>

                    <div className="birth-support">
                        <p className="story-eyebrow">Red de apoyo familiar</p>
                        <p>
                            <b>{support.level}/100</b> de disposición y capacidad de ayuda.
                        </p>
                        <p>
                            Apoyo anual potencial: {money(support.annualSupport)} PPP.
                            {support.canLend
                                ? ` Podrían prestar hasta ${money(support.maxLoan)} PPP.`
                                : " No hay margen para un préstamo familiar."}
                        </p>
                    </div>

                    <div className="birth-family-costs">
                        <p className="story-eyebrow">Costes previsibles</p>
                        <div>
                            <span>Funeral estimado</span>
                            <b>{money(household.funeralCostEstimate)} PPP</b>
                        </div>
                        <div>
                            <span>Herencia potencial</span>
                            <b>{money(household.inheritanceEstimate)} PPP</b>
                        </div>
                        <p className="story-muted">
                            Son estimaciones del modelo. La herencia solo se recibe tras el fallecimiento de ambos
                            progenitores y no sustituye a los activos reales de la partida.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
