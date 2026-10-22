import type { BirthProfile, CharacterState, Sex } from "@life-duel/shared";
import { PixelPerson } from "../../art/PixelLife";

interface Kin {
    id: string;
    name: string;
    label: string;
    age?: number;
    alive: boolean;
    sex: Sex;
    country: string;
    note?: string;
    self?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
    partner: "Pareja",
    child: "Hijo/a",
    mother: "Madre",
    father: "Padre",
    sibling: "Hermano/a",
    grandmother: "Abuela",
    grandfather: "Abuelo",
};

function parentKin(
    parent: { name: string; age: number; sex?: Sex } | undefined,
    role: "mother" | "father",
    characterAge: number,
    country: string,
): Kin | null {
    if (!parent?.name) return null;
    return {
        id: `parent-${role}`,
        name: parent.name,
        label: ROLE_LABELS[role]!,
        age: Math.max(0, parent.age + characterAge),
        alive: true,
        sex: parent.sex ?? (role === "mother" ? "female" : "male"),
        country,
    };
}

/**
 * Carrete familiar táctil. Reutiliza el pixel art original y evita una tabla
 * genealógica ancha que en un teléfono obligaba a hacer zoom.
 */
export function MobileFamilyStrip({
    character,
    birth,
    year,
}: {
    character: CharacterState;
    birth: BirthProfile;
    year: number;
}) {
    const relatives = character.story?.relatives ?? [];
    const details = birth.details;
    const people: Kin[] = [
        {
            id: "self",
            name: birth.givenName,
            label: "Tú",
            age: character.age,
            alive: character.alive,
            sex: character.sex,
            country: birth.countryCode,
            self: true,
        },
        ...relatives
            .filter((relative) => relative.role !== "sibling" || character.age < 30)
            .filter((relative) => ["partner", "child", "mother", "father", "sibling", "grandmother", "grandfather"].includes(relative.role))
            .slice(0, 14)
            .map((relative): Kin => ({
                id: relative.id,
                name: relative.name,
                label: ROLE_LABELS[relative.role] ?? "Familiar",
                age: relative.alive ? Math.max(0, year - relative.bornYear) : relative.deathAge,
                alive: relative.alive,
                sex: relative.sex,
                country: relative.role === "partner" ? character.partnerProfile?.country ?? birth.countryCode : birth.countryCode,
                note: relative.alive ? relative.occupation || undefined : relative.causeOfDeath,
            })),
    ];

    const knownIds = new Set(people.map((person) => person.id));
    if (!relatives.some((relative) => relative.role === "mother") && details?.mother) {
        const mother = parentKin(details.mother, "mother", character.age, birth.countryCode);
        if (mother && !knownIds.has(mother.id)) people.push(mother);
    }
    if (!relatives.some((relative) => relative.role === "father") && details?.father) {
        const father = parentKin(details.father, "father", character.age, birth.countryCode);
        if (father && !knownIds.has(father.id)) people.push(father);
    }
    if (character.partnerName && !relatives.some((relative) => relative.role === "partner" && relative.name === character.partnerName)) {
        people.push({
            id: "partner-name",
            name: character.partnerName,
            label: character.maritalStatus === "married" ? "Cónyuge" : "Pareja",
            alive: true,
            sex: character.sex === "female" ? "male" : "female",
            country: character.partnerProfile?.country ?? character.currentCountry,
        });
    }

    return (
        <div className="mobile-kin-wrap">
            <ul className="mobile-kin-strip" aria-label="Tu familia">
                {people.map((person) => (
                    <li
                        key={person.id}
                        className={`mobile-kin ${person.self ? "is-self" : ""} ${person.alive ? "" : "is-departed"}`}
                        aria-current={person.self ? "true" : undefined}
                    >
                        <span className="mobile-kin-art" aria-hidden="true">
                            <svg viewBox="0 0 30 38">
                                <PixelPerson
                                    seed={`${person.name}-${person.id}`}
                                    country={person.country}
                                    age={person.age ?? Math.max(8, character.age)}
                                    sex={person.sex}
                                    deceased={!person.alive}
                                    x={0}
                                    y={0}
                                />
                            </svg>
                        </span>
                        <span className="mobile-kin-label">{person.label}</span>
                        <strong>{person.name}</strong>
                        <small>
                            {person.alive
                                ? person.age === undefined ? "En tu vida" : `${person.age} años`
                                : person.age === undefined ? "En el recuerdo" : `† ${person.age} años`}
                        </small>
                        {person.note ? <em title={person.note}>{person.note}</em> : null}
                    </li>
                ))}
            </ul>
            <p className="mobile-kin-hint">Desliza para conocer a quienes caminan contigo.</p>
        </div>
    );
}
