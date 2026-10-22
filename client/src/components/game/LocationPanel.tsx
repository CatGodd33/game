import { ArrowRight, Coins, Globe2, MapPin } from "lucide-react";
import type { CharacterState, ResidenceRecord } from "@life-duel/shared";

function localAmount(character: CharacterState): string {
    const value = character.finance.money * character.currentCurrency.localPerIntlDollar;
    try {
        return new Intl.NumberFormat("es", {
            style: "currency",
            currency: character.currentCurrency.code,
            maximumFractionDigits: 0,
        }).format(value);
    } catch {
        return `${character.currentCurrency.symbol}${Math.round(value).toLocaleString("es")}`;
    }
}

/**
 * Hace visible la pregunta más básica del simulador: dónde está el personaje
 * ahora mismo, desde cuándo y por qué países ha pasado.
 */
export function LocationPanel({
    dark = false,
    character,
    countryName,
}: {
    character: CharacterState;
    countryName: (code: string) => string;
    dark?: boolean;
}) {
    const history: ResidenceRecord[] = character.residenceHistory?.length
        ? character.residenceHistory
        : [
            {
                country: character.birthCountry,
                city: character.currentLocation,
                fromYear: new Date().getFullYear() - character.age,
            },
        ];
    const current = history.at(-1);
    const moved = character.currentCountry !== character.birthCountry;
    const previous = history.slice(0, -1).slice(-3).reverse();

    return (
        <section className={`story-panel location-panel${dark ? " location-panel--duel" : ""}`} aria-labelledby="location-title">
            <h2 id="location-title">
                <MapPin className="h-4 w-4" /> Dónde estás ahora
            </h2>
            <div className="location-now">
                <span className="location-pin" aria-hidden="true">
                    <MapPin className="h-5 w-5" />
                </span>
                <div>
                    <strong>{character.currentLocation}</strong>
                    <p>{countryName(character.currentCountry)}</p>
                    <small>
                        {moved ? "Vives fuera de tu país de nacimiento" : "Tu país de nacimiento"}
                        {current?.fromYear ? ` · desde ${current.fromYear}` : ""}
                    </small>
                </div>
            </div>

            <dl className="location-facts">
                <div>
                    <dt><Globe2 className="h-3.5 w-3.5" /> Nacimiento</dt>
                    <dd>{countryName(character.birthCountry)}</dd>
                </div>
                <div>
                    <dt><Coins className="h-3.5 w-3.5" /> Moneda local</dt>
                    <dd>{character.currentCurrency.code}</dd>
                </div>
                <div>
                    <dt>Equivalente en tu bolsillo</dt>
                    <dd>{localAmount(character)}</dd>
                </div>
            </dl>

            {previous.length > 0 ? (
                <div className="location-route">
                    <p>Trayectoria reciente</p>
                    {previous.map((place) => (
                        <div key={`${place.country}-${place.fromYear}`}>
                            <span>{place.city}, {countryName(place.country)}</span>
                            <small>{place.fromYear}{place.toYear ? `–${place.toYear}` : ""}</small>
                        </div>
                    ))}
                    <div className="location-current-route">
                        <ArrowRight className="h-3 w-3" />
                        <span>Ahora: {character.currentLocation}</span>
                    </div>
                </div>
            ) : (
                <p className="story-muted location-still">
                    No has cambiado de residencia. Por ahora, toda tu vida cabe en una dirección.
                </p>
            )}
        </section>
    );
}
