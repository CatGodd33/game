import type { BirthProfile, CharacterState } from "@life-duel/shared";

const money = (value: number) =>
    new Intl.NumberFormat("es", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
    }).format(value);

const FLAG_LABELS: Record<string, string> = {
    familia_puede_ayudar: "La familia puede ayudar",
    padre_en_apuros: "El padre atraviesa apuros económicos",
    mother_en_apuros: "La madre atraviesa apuros económicos",
    parents_mayores: "Los padres necesitan cuidados",
    herencia_pendiente: "Herencia pendiente de la mayoría de edad",
    madre_fallecida: "La madre ha fallecido",
    father_fallecida: "El padre ha fallecido",
    hijo_fallecido: "Ha perdido a un hijo",
    tutela_familiar: "Creció bajo tutela familiar",
    profesion_medica: "Formación y carrera en medicina",
    profesion_musica: "Formación y carrera en música",
    profesion_tecnologia: "Formación y carrera en tecnología",
    profesion_derecho: "Formación y carrera en derecho",
    profesion_oficio: "Carrera en un oficio",
    negocio_activo: "Tiene un negocio en marcha",
    negocio_quebrado: "Un negocio anterior quebró",
    quiebra_personal: "Ha pasado por una quiebra personal",
    contexto_poliginia_explicado: "Hogar con una organización familiar compleja",
    conduccion_temeraria: "Conduce asumiendo riesgos",
    adiccion: "Problemas de consumo",
    delito_violento: "Antecedentes de violencia",
    exposicion_accidente: "Trabajo con exposición a accidentes",
    credito_suspendido: "Acceso al crédito restringido",
    delito_menor: "Un delito menor en su pasado",
    antecedente_penal: "Antecedentes penales",
    dinero_dudoso: "Ganó dinero en un negocio opaco",
    estafado: "Fue víctima de una estafa",
    denunciante: "Denunció una operación ilegal",
    casa_propia: "Vivienda propia",
    hipoteca: "Hipoteca en curso",
    vivienda_pagada: "Vivienda pagada al contado",
    alquiler: "Vive de alquiler",
    migrante: "Vive fuera de su país de nacimiento",
    estatus_irregular: "Situación administrativa irregular",
    migracion_preparada: "Prepara una migración futura",
    visado_rechazado: "Un visado le fue denegado",
    estafa_migratoria: "Fue víctima de una estafa migratoria",
    segunda_oportunidad: "Reconstruyó su vida tras un revés",
    beca_escolar: "Estudió con una beca",
    dejo_estudios: "Dejó los estudios para trabajar",
    contrato_negociado: "Negoció condiciones laborales",
    contrato_firmado_sin_leer: "Firmó un contrato sin leerlo",
    despido_realizado: "Ha tenido que despedir a alguien",
    empresa_familiar: "Emplea a alguien de su familia",
    socio_empresa: "Comparte la empresa con un socio",
    sin_hijos_elegido: "Eligió no tener hijos",
    descanso_digital: "Cuida su descanso digital",
    mascota: "Comparte la vida con una mascota",
    mascota_acogida: "Acogió temporalmente a un animal",
    inversor: "Tiene parte de sus ahorros invertidos",
    ahorro_plazo: "Mantiene un ahorro a plazo",
    fondo_emergencia: "Dispone de un fondo de emergencia",
    hogar_mejorado: "Ha mejorado su hogar",
    mudanza_reciente: "Se mudó hace poco",
    ahorro_vivienda: "Ahorra para una vivienda",
    voluntariado: "Dedica tiempo a causas locales",
    donante: "Apoya económicamente una causa",
    arte: "Cultiva una práctica artística",
    testamento: "Ha ordenado su testamento",
    herencia_hablada: "Ha conversado sobre su herencia",
    limites_laborales: "Defiende límites en el trabajo",
    horas_extra: "Ha asumido horas extraordinarias",
    cambio_laboral: "Prepara un cambio de trabajo",
    apoyo_sindical: "Participa en la vida sindical",
};

const humanize = (flag: string) =>
    FLAG_LABELS[flag] ?? flag.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const LEVEL_LABEL: Record<CharacterState["employment"]["status"], string> = {
    child: "Infancia",
    student: "Estudios",
    unemployed: "Sin empleo",
    employed: "Empleado",
    "self-employed": "Trabajo propio",
    retired: "Jubilación",
    disabled: "Incapacidad laboral",
};

function Meter({
    label,
    value,
    tone = "positive",
}: {
    label: string;
    value: number;
    tone?: "positive" | "negative";
}) {
    const rounded = Math.round(value);
    return (
        <div className={`context-meter ${tone}`}>
            <div>
                <span>{label}</span>
                <b>{rounded}</b>
            </div>
            <div className="context-meter-track" aria-hidden="true">
                <i style={{ width: `${Math.max(0, Math.min(100, rounded))}%` }} />
            </div>
        </div>
    );
}

export function MindPanel({ character }: { character: CharacterState }) {
    const psychology = character.psychology;
    if (!psychology) {
        return (
            <section className="story-panel context-panel">
                <h2>Mente y carácter</h2>
                <p className="story-muted">
                    Esta partida se creó antes de que existiera el modelo psicológico. Las nuevas vidas registran
                    estrés, duelo, autoestima y satisfacción.
                </p>
            </section>
        );
    }
    return (
        <section className="story-panel context-panel">
            <h2>
                Mente y carácter <small>Modelo aproximado</small>
            </h2>
            <div className="context-meters">
                <Meter label="Resiliencia" value={psychology.resilience} />
                <Meter label="Autoestima" value={psychology.selfEsteem} />
                <Meter label="Satisfacción vital" value={psychology.lifeSatisfaction} />
                <Meter label="Estrés" value={psychology.stress} tone="negative" />
                <Meter label="Duelo" value={psychology.grief} tone="negative" />
                <Meter label="Desgaste laboral" value={psychology.burnout} tone="negative" />
            </div>
            <p className="story-muted">
                Salud, dinero y vínculos influyen en estas cifras. No son un diagnóstico: son una lectura del
                estado emocional que arrastra la vida simulada.
            </p>
        </section>
    );
}

export function MaterialPanel({
    character,
    birth,
}: {
    character: CharacterState;
    birth: BirthProfile;
}) {
    const household = birth.details?.household;
    const activeLoans = (character.loans ?? []).filter((loan) => loan.active);
    const loanBalance = activeLoans.reduce((sum, loan) => sum + loan.balance, 0);
    const credit = character.credit;
    const business = character.business;
    const flags = (character.flags ?? []).filter((flag) => FLAG_LABELS[flag]);

    return (
        <section className="story-panel context-panel material-panel">
            <h2>
                Vida material <small>PPP</small>
            </h2>
            <div className="material-grid">
                <div>
                    <span>Trabajo</span>
                    <b>{character.employment.occupation ?? LEVEL_LABEL[character.employment.status]}</b>
                    <small>
                        {LEVEL_LABEL[character.employment.status]}
                        {character.employment.yearsInRole > 0 ? ` · ${character.employment.yearsInRole} años` : ""}
                    </small>
                </div>
                <div>
                    <span>Nivel de vida</span>
                    <b>{Math.round(character.livingStandard)}/100</b>
                    <small>Vivienda {Math.round(character.housingQuality)}/100</small>
                </div>
                <div>
                    <span>Historial de crédito</span>
                    <b>{credit ? `${Math.round(credit.score)}/100` : "—"}</b>
                    <small>{credit ? `${credit.bankruptcies} quiebra(s)` : "Sin datos"}</small>
                </div>
                <div>
                    <span>Préstamos activos</span>
                    <b>{activeLoans.length}</b>
                    <small>{activeLoans.length > 0 ? `${money(loanBalance)} pendientes` : "Sin saldo pendiente"}</small>
                </div>
            </div>

            {business ? (
                <div className={`business-card ${business.active ? "" : "closed"}`}>
                    <header>
                        <span>{business.active ? "Negocio en marcha" : "Negocio cerrado"}</span>
                        <b>{business.name}</b>
                    </header>
                    <dl>
                        <div>
                            <dt>Ingresos anuales</dt>
                            <dd>{money(business.annualRevenue)}</dd>
                        </div>
                        <div>
                            <dt>Costes</dt>
                            <dd>{money(business.annualCosts)}</dd>
                        </div>
                        <div>
                            <dt>Marketing</dt>
                            <dd>{money(business.marketingSpend)}</dd>
                        </div>
                        <div>
                            <dt>Reputación</dt>
                            <dd>{Math.round(business.reputation)}/100</dd>
                        </div>
                    </dl>
                    <p className="story-muted">
                        {business.employees} empleado(s) · fundado a los {business.foundedAge} años
                        {business.insolventYears > 0 ? ` · ${business.insolventYears} año(s) de pérdidas` : ""}
                    </p>
                </div>
            ) : null}

            {household ? (
                <div className="origin-household">
                    <p className="story-eyebrow">El hogar de origen</p>
                    <p>
                        {household.structureLabel} · {household.religion} · religiosidad {household.religiosity}/100
                    </p>
                    <dl>
                        <div>
                            <dt>Ingresos familiares</dt>
                            <dd>{money(household.budget.annualIncome)}</dd>
                        </div>
                        <div>
                            <dt>Gastos familiares</dt>
                            <dd>{money(household.budget.annualExpenses)}</dd>
                        </div>
                        <div>
                            <dt>Ahorros</dt>
                            <dd>{money(household.budget.savings)}</dd>
                        </div>
                        <div>
                            <dt>Deuda familiar</dt>
                            <dd>{money(household.budget.debt)}</dd>
                        </div>
                    </dl>
                    <p className="story-muted">
                        La economía del hogar se fija al nacer como contexto. Los ingresos y gastos personales
                        aparecen a partir de la vida adulta.
                    </p>
                </div>
            ) : null}

            {flags.length > 0 ? (
                <div className="life-flags" aria-label="Rasgos y consecuencias acumuladas">
                    <p className="story-eyebrow">Decisiones que dejaron huella</p>
                    <div>
                        {flags.slice(0, 10).map((flag) => (
                            <span key={flag}>{humanize(flag)}</span>
                        ))}
                    </div>
                </div>
            ) : null}
        </section>
    );
}
