import type { BirthProfile, GameConfig } from "@life-duel/shared";
import { DIFFICULTY_META } from "@life-duel/shared";
import { Baby, CalendarDays, MapPin, ShieldCheck, Users } from "lucide-react";
import { LifeScene } from "../art/LifeScene";
import { Portrait } from "../art/Portrait";
import { Badge } from "../ui/Badge";
import { SoftCard } from "../ui/Card";

export function BirthSummary({
    birth,
    config,
    compact = false,
}: {
    birth: BirthProfile;
    config: GameConfig;
    compact?: boolean;
}) {
    return (
        <SoftCard className="overflow-hidden">
            <div className={compact ? "relative h-24" : "relative h-36"}>
                <LifeScene stage="infancia" seed={`${birth.countryCode}-${birth.year}-${birth.givenName}`} compact />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-950/20 to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-end gap-3">
                    <Portrait
                        seed={`${birth.countryCode}-${birth.year}-${birth.givenName}`}
                        stage="infancia"
                        sex={birth.sex}
                        size={compact ? "sm" : "md"}
                        className="ring-2 ring-ink-950/70"
                    />
                    <div className="pb-0.5">
                        <p className="text-[0.62rem] uppercase tracking-[0.16em] text-gold-soft">La misma vida para ambos</p>
                        <h3 className="text-lg text-parchment">
                            {birth.givenName} {birth.surname}
                        </h3>
                    </div>
                </div>
            </div>
            <div className={compact ? "p-4" : "p-5"}>
                <div className="flex flex-wrap gap-2">
                    <Badge tone="gold">
                        <MapPin className="h-3 w-3" aria-hidden="true" /> {birth.countryName}
                    </Badge>
                    <Badge tone="sky">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" /> {birth.year}
                    </Badge>
                    <Badge tone="violet">
                        <Baby className="h-3 w-3" aria-hidden="true" /> {birth.sex === "female" ? "Mujer" : "Hombre"}
                    </Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-parchment-dim">{birth.family.story}</p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div>
                        <dt className="text-parchment-faint">Familia</dt>
                        <dd className="mt-0.5 font-medium text-parchment">{birth.family.label}</dd>
                    </div>
                    <div>
                        <dt className="flex items-center gap-1 text-parchment-faint">
                            <Users className="h-3 w-3" aria-hidden="true" /> Hogar
                        </dt>
                        <dd className="mt-0.5 font-medium text-parchment">{birth.family.householdSize} personas</dd>
                    </div>
                    <div>
                        <dt className="text-parchment-faint">Esperanza de vida</dt>
                        <dd className="mt-0.5 font-medium text-parchment">{birth.lifeExpectancyAtBirth.toFixed(1)} años</dd>
                    </div>
                    <div>
                        <dt className="flex items-center gap-1 text-parchment-faint">
                            <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Dificultad
                        </dt>
                        <dd className="mt-0.5 font-medium text-parchment">{DIFFICULTY_META[config.difficulty].label}</dd>
                    </div>
                    <div>
                        <dt className="text-parchment-faint">Nacimiento</dt>
                        <dd className="mt-0.5 font-medium text-parchment">Hoy</dd>
                    </div>
                    <div>
                        <dt className="text-parchment-faint">Lugar</dt>
                        <dd className="mt-0.5 font-medium text-parchment">{birth.location}</dd>
                    </div>
                </dl>
                <p className="mt-3 border-t border-white/[0.06] pt-3 text-[0.62rem] leading-relaxed text-parchment-faint">
                    Fuente de esperanza de vida: {birth.lifeExpectancySource}. Los datos son indicativos y algunas
                    variables del modelo son parámetros provisionales identificados.
                </p>
            </div>
        </SoftCard>
    );
}
