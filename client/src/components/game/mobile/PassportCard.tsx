import type { BirthProfile, CharacterState } from "@life-duel/shared";
import { EDUCATION_META, MARITAL_LABELS } from "@life-duel/shared";
import { BadgeCheck, BriefcaseBusiness, GraduationCap, MapPin, UsersRound } from "lucide-react";
import { PixelPortrait } from "../../art/PixelLife";

function normaliseMrz(value: string): string {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function mrzLine(givenName: string, surname: string, country: string): string {
    const namePart = `${normaliseMrz(surname)}<<${normaliseMrz(givenName)}`.padEnd(30, "<");
    return `LD${country}${namePart}`.slice(0, 36).padEnd(36, "<");
}

function childrenLabel(count: number): string {
    if (count <= 0) return "Sin hijos";
    return count === 1 ? "1 hijo/a" : `${count} hijos/as`;
}

/**
 * Resumen de identidad con estética de pasaporte. Es una pieza de juego:
 * no reproduce un documento oficial ni usa datos reales de la persona.
 */
export function PassportCard({
    birth,
    character,
    countryName,
    onOpenBirth,
}: {
    birth: BirthProfile;
    character: CharacterState;
    countryName: (code: string) => string;
    onOpenBirth: () => void;
}) {
    const sex = birth.sex === "female" ? "F" : "M";
    const education = EDUCATION_META[character.educationLevel]?.label ?? character.educationLevel;
    const occupation = character.employment.occupation
        ?? (character.age < 18 ? "En familia" : character.employment.status === "retired" ? "Jubilación" : "Sin empleo");

    return (
        <section className="mobile-passport" aria-labelledby="mobile-passport-title" data-testid="mobile-passport">
            <div className="mobile-passport-band">
                <span>LIFE DUEL · PASAPORTE DE VIDA</span>
                <span>2.2</span>
            </div>
            <div className="mobile-passport-body">
                <div className="mobile-passport-ident">
                    <div className="mobile-passport-photo">
                        <PixelPortrait birth={birth} age={character.age} />
                        <span className="mobile-passport-stamp" aria-hidden="true">VIDA<br />2.2</span>
                    </div>
                    <div className="mobile-passport-name">
                        <span>Nombre de la vida</span>
                        <h2 id="mobile-passport-title">
                            {birth.givenName}
                            <br />
                            <em>{birth.surname}</em>
                        </h2>
                        <small>Serie {birth.countryCode} · {birth.year}</small>
                    </div>
                </div>

                <dl className="mobile-passport-grid">
                    <div>
                        <dt>Sexo</dt>
                        <dd>{sex === "F" ? "Mujer" : "Hombre"}</dd>
                    </div>
                    <div>
                        <dt>Año de nacimiento</dt>
                        <dd>{birth.year}</dd>
                    </div>
                    <div>
                        <dt>Lugar de nacimiento</dt>
                        <dd>{countryName(birth.countryCode)} · {birth.location}</dd>
                    </div>
                    <div>
                        <dt>Residencia</dt>
                        <dd>{character.currentLocation}, {countryName(character.currentCountry)}</dd>
                    </div>
                    <div>
                        <dt><GraduationCap aria-hidden="true" /> Educación</dt>
                        <dd>{education}</dd>
                    </div>
                    <div>
                        <dt><BriefcaseBusiness aria-hidden="true" /> Ocupación</dt>
                        <dd>{occupation}</dd>
                    </div>
                    <div>
                        <dt><UsersRound aria-hidden="true" /> Estado civil</dt>
                        <dd>{MARITAL_LABELS[character.maritalStatus] ?? character.maritalStatus} · {childrenLabel(character.children)}</dd>
                    </div>
                    <div>
                        <dt><MapPin aria-hidden="true" /> Países vividos</dt>
                        <dd>{[...new Set([character.birthCountry, ...(character.countriesLived ?? []), character.currentCountry])].map(countryName).join(" · ")}</dd>
                    </div>
                </dl>

                <div className="mobile-passport-mrz" aria-hidden="true">
                    <span>{mrzLine(birth.givenName, birth.surname, birth.countryCode)}</span>
                    <span>{`LIFEDUEL${String(character.age).padStart(3, "0")}<<${normaliseMrz(character.currentCurrency.code)}<<V22`}</span>
                </div>

                <button type="button" className="mobile-passport-button" onClick={onOpenBirth}>
                    <BadgeCheck aria-hidden="true" />
                    Ver registro de nacimiento
                </button>
            </div>
        </section>
    );
}
