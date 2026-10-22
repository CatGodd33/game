import type { CharacterState } from "@life-duel/shared";

const money = (n: number) =>
    new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/**
 * Ficha de viviendas. La renta solo existe si hay un contrato activo: una casa
 * propia no genera ingresos por el hecho de tenerla. La rentabilidad se muestra
 * bruta y neta para que la decisión no parezca dinero gratis.
 */
export function PropertyPortfolio({
    character: c,
    onManage,
}: {
    character: CharacterState;
    onManage: () => void;
}) {
    const homes = (c.assets ?? []).filter((asset) => asset.kind === "home");
    if (!homes.length) return null;

    return (
        <section className="story-panel property-portfolio">
            <h2>Tus viviendas <small>{homes.length}</small></h2>
            {homes.map((home) => {
                const annualRent = home.rental?.occupied ? home.rental.monthlyRent * 12 : 0;
                const potentialRent = Math.round(home.value * 0.0045 * 12);
                const grossYield = home.value > 0 ? (potentialRent / home.value) * 100 : 0;
                const netYield = grossYield * 0.55;
                const arrears = home.rental?.arrears ?? 0;
                return (
                    <article key={home.id}>
                        <div>
                            <strong>{home.name}</strong>
                            <span>{home.location ?? c.currentLocation} · valor {money(home.value)} PPP</span>
                        </div>
                        {home.rental ? (
                            <>
                                <p>{home.rental.occupied ? `${home.rental.tenantName} · contrato activo` : "Vivienda vacante"}</p>
                                <dl>
                                    <div><dt>Renta pactada</dt><dd>{money(home.rental.monthlyRent)}/mes</dd></div>
                                    <div><dt>Renta anual</dt><dd>{money(annualRent)}</dd></div>
                                    <div><dt>Rentabilidad neta</dt><dd>{home.rental.occupied ? `${netYield.toFixed(1)} %` : "—"}</dd></div>
                                    <div><dt>Estado</dt><dd>{Math.round(home.rental.condition)}/100</dd></div>
                                    {arrears > 0 ? <div className="property-arrears"><dt>Rentas sin cobrar</dt><dd>{money(arrears)}</dd></div> : null}
                                </dl>
                                {!home.rental.occupied ? (
                                    <p className="story-muted">Sin contrato: la renta potencial es {money(potentialRent)}/año ({grossYield.toFixed(1)} % bruto), antes de mantenimiento, impagos y vacancia.</p>
                                ) : null}
                            </>
                        ) : (
                            <p className="story-muted">
                                Uso personal. Renta potencial {money(potentialRent)}/año ({grossYield.toFixed(1)} % bruto); el neto ronda {netYield.toFixed(1)} % tras costes. Una vivienda no paga sola: hay que alquilarla y cobrar.
                            </p>
                        )}
                        {home.loanBalance ? <small>Hipoteca pendiente {money(home.loanBalance)} · cuota {money(home.monthlyPayment ?? 0)}/mes</small> : null}
                    </article>
                );
            })}
            <button className="story-button full" onClick={onManage}>Gestionar alquiler, reforma o venta</button>
            <p className="story-muted">La renta aparece en la cuenta solo cuando se cobra. Mantenimiento, impuestos y financiación siguen siendo gastos.</p>
        </section>
    );
}
