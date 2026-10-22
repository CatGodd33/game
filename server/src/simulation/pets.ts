import type { CharacterState, PetState } from "@life-duel/shared";
import { clamp } from "@life-duel/shared";
import type { Rng } from "./rng.js";

/**
 * Las mascotas son parte del hogar, no un adorno: envejecen, enferman y
 * mueren. Su cuidado aparece en decisiones y en el presupuesto del personaje.
 */
export function createPet(
    character: CharacterState,
    spec: { name: string; species: PetState["species"] },
    year: number,
): PetState {
    const pet: PetState = {
        id: `pet-${character.id}-${year}-${(character.pets?.length ?? 0) + 1}`,
        name: spec.name,
        species: spec.species,
        age: 0,
        health: 88,
        alive: true,
    };
    character.pets = [...(character.pets ?? []), pet];
    character.flags = [...new Set([...(character.flags ?? []), "mascota"])];
    character.milestones.push({
        id: `ms-pet-${pet.id}`,
        age: character.age,
        year,
        title: `Adoptó a ${pet.name}`,
        category: "familia",
    });
    return pet;
}

export function advancePets(character: CharacterState, rng: Rng): string[] {
    const lines: string[] = [];
    for (const pet of character.pets ?? []) {
        if (!pet.alive) continue;
        pet.age += 1;
        const decline = pet.age > 9 ? 4.5 : pet.age > 6 ? 2.2 : 0.6;
        pet.health = Math.round(clamp(pet.health - decline + rng.normal(0, 1.2), 0, 100) * 10) / 10;
        if (pet.health < 22 && rng.chance(14)) {
            pet.alive = false;
            character.stats.happiness = clamp(character.stats.happiness - 4);
            lines.push(`${pet.name} murió después de una última temporada de cuidados. La casa quedó con un silencio distinto.`);
        } else if (pet.health < 35 && rng.chance(22)) {
            lines.push(`${pet.name} necesitó una visita al veterinario. El gasto fue pequeño; la preocupación, menos.`);
            character.stats.happiness = clamp(character.stats.happiness - 1);
        }
    }
    return lines;
}
