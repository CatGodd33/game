import type { BirthProfile, CharacterState, PetState, Relative, Sex } from "@life-duel/shared";
import { hashString } from "../../lib/utils";

function appearance(country: string, seed: string) {
  const n = hashString(seed);
  const palettes =
    country === "NGA" ? ["#563521", "#71462c", "#87593c", "#62412d"]
      : country === "EGY" || country === "IND" || country === "IDN" ? ["#9c6842", "#b17a51", "#7c5136", "#c18b60"]
        : country === "ZAF" || country === "BRA" || country === "USA" ? ["#704a32", "#ad7752", "#ce9b72", "#e1b590", "#5b3c2c"]
          : (country === "JPN" || country === "CHN") ? ["#c99470", "#d9ad86", "#b9805e"]
            : country === "MEX" || country === "ARG" ? ["#b47c55", "#d2a078", "#946443", "#e0b18d"]
              : ["#d6a681", "#ebc5a1", "#b7845f", "#c99a76"];
  return {
    skin: palettes[n % palettes.length],
    hair: ["#241d1c", "#35261f", "#1b1d22", "#533626"][n % 4],
    shirt: ["#4da39b", "#cf7275", "#6e91b0", "#d1a456", "#8784ac", "#6f9881"][n % 6],
    pants: ["#293c49", "#34454c", "#493e4a"][n % 3],
  };
}

export function PixelPerson({
  seed,
  country,
  age,
  sex,
  x = 0,
  y = 0,
  scale = 1,
  deceased = false,
}: {
  seed: string;
  country: string;
  age: number;
  sex: Sex;
  x?: number;
  y?: number;
  scale?: number;
  deceased?: boolean;
}) {
  const p = appearance(country, seed);
  const hair = age >= 65 ? "#b9bab1" : age >= 50 ? "#7b7770" : p.hair;
  if (deceased) {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} opacity=".45">
        <path d="M6 30V17Q6 9 12 9Q18 9 18 17V30Z" fill="#75878a" />
        <path d="M12 14V23M9 17H15" stroke="#283d40" strokeWidth="2" />
        <path d="M3 31H21" stroke="#92aaa1" />
      </g>
    );
  }
  if (age < 2) {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <ellipse cx="12" cy="31" rx="12" ry="2" fill="#050f17" opacity=".4" />
        <rect x="2" y="20" width="21" height="9" fill="#b58d66" />
        <rect x="4" y="17" width="17" height="7" fill="#e7e2c8" />
        <rect x="9" y="16" width="7" height="5" fill={p.skin} />
        <path d="M3 24V32M21 24V32" stroke="#7d644e" strokeWidth="2" />
        <rect x="10" y="17" width="1" height="1" fill="#302722" />
        <rect x="14" y="17" width="1" height="1" fill="#302722" />
      </g>
    );
  }
  const child = age < 13;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="pixel-person">
      <ellipse cx="12" cy="32" rx="10" ry="2" fill="#030c16" opacity=".4" />
      <g transform={child ? "translate(3 9) scale(.75)" : undefined}>
        <path d={sex === "female" ? "M4 6H6V3H18V6H20V21H4Z" : "M5 6H7V3H17V5H20V14H4V7Z"} fill={hair} />
        <path d="M6 7H18V10H20V16H18V20H6V17H4V10H6Z" fill={p.skin} />
        <path d="M7 8V6H17V10H14V8Z" fill={hair} />
        <rect x="8" y="12" width="2" height="2" fill="#282529" />
        <rect x="14" y="12" width="2" height="2" fill="#282529" />
        <path d="M10 16Q12 19 14 16" fill="none" stroke="#895c4b" strokeWidth=".7" /><ellipse cx="6.5" cy="15" rx="1.5" ry=".7" fill="#df8e88" opacity=".5"/><ellipse cx="17.5" cy="15" rx="1.5" ry=".7" fill="#df8e88" opacity=".5"/><rect x="8" y="12" width=".7" height=".7" fill="#fff"/><rect x="14" y="12" width=".7" height=".7" fill="#fff"/>
        <rect x="10" y="19" width="4" height="2" fill={p.skin} />
        <path d="M6 21H18V24H20V29H4V24H6Z" fill={p.shirt} />
        <path d="M4 24H6V29H3V25ZM18 24H21V29H18Z" fill={p.skin} />
        <path d="M6 29H11V33H6ZM13 29H18V33H13Z" fill={p.pants} />
        <path d="M5 33H11V35H4V34ZM13 33H19V35H13Z" fill="#1d242a" />
        {age >= 65 && (
          <>
            <rect x="7" y="11" width="4" height="3" fill="none" stroke="#aeb6ab" strokeWidth=".7" />
            <rect x="13" y="11" width="4" height="3" fill="none" stroke="#aeb6ab" strokeWidth=".7" />
          </>
        )}
      </g>
    </g>
  );
}

export function PixelPortrait({ birth, age = 0 }: { birth: BirthProfile; age?: number }) {
  return (
    <svg viewBox="0 0 48 56" role="img" aria-label={`Retrato de ${birth.givenName}, ${age} años`} shapeRendering="crispEdges" className="pixel-portrait">
      <rect width="48" height="56" fill="#8dd6dc" />
      <path d="M0 13H7V9H18V13H25V17H0ZM30 6H39V9H48V14H30Z" fill="#e1eddb" />
      <path d="M0 35H7V28H12V37H20V30H28V37H37V24H46V39H48V56H0Z" fill="#53747b" />
      <rect y="46" width="48" height="10" fill="#536a6a" />
      <path d="M2 51H12M19 51H28M35 51H45" stroke="#b9c5b2" />
      <PixelPerson seed={`${birth.givenName}-${birth.surname}`} country={birth.countryCode} age={Math.max(3, age)} sex={birth.sex} x={7} y={5} scale={1.5} />
    </svg>
  );
}

export function PixelPet({ pet, x, y }: { pet: PetState; x: number; y: number }) {
  const kind=pet.kind ?? pet.species;
  if(kind === "pez") return <g transform={`translate(${x} ${y})`}><path d="M3 15Q0 33 16 34Q32 33 29 15Z" fill="#72b8ca" opacity=".8"/><ellipse cx="15" cy="25" rx="7" ry="4" fill="#efb76b"/><path d="M21 25L27 20V30Z" fill="#e79d57"/><circle cx="12" cy="24" r="1" fill="#293d42"/></g>;
  if(kind === "ave") return <g transform={`translate(${x} ${y})`}><path d="M16 22V34M8 34H24" stroke="#9e8970" strokeWidth="2"/><ellipse cx="14" cy="19" rx="8" ry="10" fill="#8fcb9c"/><circle cx="13" cy="13" r="7" fill="#a8dc9d"/><circle cx="11" cy="12" r="1.5" fill="#233c3b"/><path d="M6 13L1 16L6 17" fill="#edbd69"/></g>;
  if(kind === "caballo") return <g transform={`translate(${x} ${y})`}><rect x="2" y="15" width="25" height="13" rx="5" fill="#b88d71"/><path d="M20 18L18 5Q28 0 31 13L28 24" fill="#b88d71"/><path d="M22 5L20 1L25 4" fill="#7d5e53"/><circle cx="26" cy="10" r="1.5" fill="#262f32"/><path d="M5 27V35M23 27V35" stroke="#7d5e53" strokeWidth="3"/></g>;
  const dog = pet.species === "perro";
  const body = dog ? "#b98a5c" : "#7d8998";
  return (
    <g transform={`translate(${x} ${y})`} opacity={pet.alive ? 1 : 0.4}>
      <ellipse cx="15" cy="31" rx="12" ry="2" fill="#030c16" opacity=".35" />
      <rect x="5" y="18" width="20" height="11" rx="5" fill={body} />
      <circle cx="9" cy="16" r="7" fill={body} />
      {kind === "conejo" && <><ellipse cx="5" cy="6" rx="2.5" ry="8" fill="#c4becb"/><ellipse cx="13" cy="6" rx="2.5" ry="8" fill="#c4becb"/></>}
      {dog ? <><path d="M4 11L7 16L10 12Z" fill="#8b633f" /><path d="M14 11L11 16L8 12Z" fill="#8b633f" /><rect x="8" y="15" width="2" height="2" fill="#1e2529" /><rect x="12" y="15" width="2" height="2" fill="#1e2529" /><path d="M9 19H13" stroke="#432f24" strokeWidth="1" /></> : <><path d="M4 10L7 14L10 11Z" fill={body} /><path d="M14 10L11 14L8 11Z" fill={body} /><rect x="8" y="15" width="2" height="2" fill="#1e2529" /><rect x="12" y="15" width="2" height="2" fill="#1e2529" /></>}
      <path d="M9 29V34M21 29V34" stroke={body} strokeWidth="3" />
      <path d="M25 18Q31 14 29 8" stroke={body} strokeWidth="3" fill="none" strokeLinecap="round" />
    </g>
  );
}

export function PixelFamilyScene({ birth, character, year }: { birth: BirthProfile; character: CharacterState; year: number }) {
  const relatives = character.story?.relatives ?? [];
  const family = character.age < 18
    ? relatives.filter((r) => ["mother", "father", "sibling"].includes(r.role) && r.alive)
    : relatives.filter((r) => ["partner", "child"].includes(r.role) && r.alive && r.inHousehold !== false && (r.role !== "partner" || r.name === character.partnerName));
  const shown = family;
  const rural = birth.details?.rural && character.currentCountry === birth.countryCode;
  const pets = (character.pets ?? []).filter((pet) => pet.alive);
  const people: { name: string; age: number; sex: Sex; seed: string; country?:string }[] = [
    ...shown.map((r: Relative) => ({ name: r.name, age: year - r.bornYear, sex: r.sex, seed: `${r.name}-${r.id}`,country:r.role==="partner"?character.partnerProfile?.country:birth.countryCode })),
    ...((character.grandchildren ?? 0) > 0 && !relatives.some(r => r.generation === "grandchild")
      ? [{ name: "Nieto/a", age: 7, sex: "female" as Sex, seed: `grandchild-${character.id}` }]
      : []),
    { name: birth.givenName, age: character.age, sex: character.sex, seed: `${birth.givenName}-${birth.surname}` },
  ];
  const totalWidth = people.length * 34 + pets.length * 30;
  return (
    <figure className="pixel-scene">
      <svg viewBox="0 0 600 205" role="img" aria-label={`${character.currentLocation}: ${people.map((p) => `${p.name}, ${p.age} años`).join("; ")}`} shapeRendering="crispEdges">
        <defs>
          <linearGradient id="scene-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b8d4df" />
            <stop offset=".56" stopColor="#d9e3d7" />
            <stop offset="1" stopColor="#f2dec2" />
          </linearGradient>
        </defs>
        <rect width="600" height="205" fill="url(#scene-sky)" />
        <circle cx="486" cy="54" r="22" fill="#ffd9a3" opacity=".96" />
        <circle cx="486" cy="54" r="34" fill="#ffd9a3" opacity=".13" />
        <path d="M0 76H600V143H0Z" fill="#b4c5be" opacity=".5" />
        {Array.from({ length: 22 }, (_, i) => <rect key={i} x={(i * 137 + 23) % 600} y={(i * 19) % 62} width={i % 3 ? 1 : 2} height="2" fill="#fff7d7" opacity={0.2 + (i % 5) * 0.1} />)}
        {rural ? (
          <>
            <path d="M0 117L68 75L142 112L221 78L293 120L390 91L474 117L551 77L600 108V165H0Z" fill="#98b19c" />
            <path d="M0 138L112 126L257 151L401 120L600 145V205H0Z" fill="#a9bd93" />
            <path d="M0 158H600M0 171H600M0 185H600" stroke="#6a7955" strokeWidth="2" />
            <path d="M480 79H532V142H480Z" fill="#9f9d7b" />
            <path d="M467 79L506 54L545 79Z" fill="#877358" />
            <rect x="498" y="113" width="15" height="29" fill="#3d4943" />
          </>
        ) : (
          <>
            {[12, 128, 205, 374, 444].map((x, i) => (
              <g key={x}>
                <rect x={x} y={i % 2 ? 76 : 36} width={i === 0 ? 90 : 58} height={i % 2 ? 86 : 126} fill={i % 2 ? "#d1c9b5" : "#c3c4b5"} stroke="#939f93" strokeWidth="3" />
                {Array.from({ length: 16 }, (_, j) => <rect key={j} x={x + 9 + (j % 4) * 14} y={(i % 2 ? 86 : 48) + Math.floor(j / 4) * 19} width="5" height="8" fill={(j + i) % 4 === 0 ? "#f6d489" : "#91a9ab"} />)}
              </g>
            ))}
            <path d="M500 104H586V166H500Z" fill="#c7c5b2" stroke="#8b9d91" strokeWidth="3" />
            <path d="M488 104L543 78L598 104Z" fill="#a2bda3" />
            <rect x="535" y="129" width="18" height="37" fill="#8c9f8b" />
            <path d="M0 163H600V205H0Z" fill="#acb3a5" />
            <path d="M0 175H600M0 198H600" stroke="#c8ccba" strokeWidth="2" />
            <path d="M10 187H35M55 187H80M100 187H125M145 187H170M190 187H215M235 187H260M280 187H305M325 187H350M370 187H395M415 187H440M460 187H485M505 187H530M550 187H575" stroke="#b1b19a" strokeWidth="3" />
          </>
        )}
        <path d="M104 100V162M99 105H109M395 99V164M390 104H400" stroke="#6c8782" strokeWidth="3" />
        <path d="M104 106H395" stroke="#4f686a" strokeWidth="2" />
        <g transform={`translate(${300 - Math.min(500,totalWidth) / 2} ${155*(1-Math.min(1,500/totalWidth))}) scale(${Math.min(1,500/totalWidth)})`}>
          {people.map((p, i) => <PixelPerson key={p.seed} seed={p.seed} country={p.country??birth.countryCode} age={p.age} sex={p.sex} x={i * 34} y={116} scale={1.35} />)}
          {pets.map((pet, i) => <PixelPet key={pet.id} pet={pet} x={people.length * 34 + i * 28} y={142} />)}
        </g>
      </svg>
      <figcaption>
        {character.currentLocation}, {countryNameFor(birth, character)} · {rural ? "una casa en el campo" : "el barrio donde vives"}
        <small>{people.map((p) => `${p.name}, ${p.age}`).join(" · ")}{pets.length ? ` · ${pets.map((p) => p.name).join(" y ")}` : ""}</small>
      </figcaption>
    </figure>
  );
}

function countryNameFor(birth: BirthProfile, character: CharacterState): string {
  if (character.currentCountry === birth.countryCode) return birth.countryName;
  const names: Record<string, string> = {
    ESP: "España", MEX: "México", ARG: "Argentina", BRA: "Brasil", USA: "Estados Unidos",
    NGA: "Nigeria", IND: "India", JPN: "Japón", DEU: "Alemania", FRA: "Francia",
    CHN: "China", ITA:"Italia", ZAF: "Sudáfrica", IDN: "Indonesia", EGY: "Egipto", SWE: "Suecia",
  };
  return names[character.currentCountry] ?? character.currentCountry;
}

export function AnimalPortrait({kind}:{kind:string}) { return <svg className="animal-portrait" viewBox="0 0 48 44" role="img" aria-label={kind}><rect width="48" height="44" rx="8" fill="#294c40"/><circle cx="36" cy="9" r="6" fill="#e5cd8744"/><PixelPet pet={{id:kind,name:kind,kind,species:kind==="perro"?"perro":kind==="gato"?"gato":"otro",age:0,health:90,alive:true}} x={7} y={3}/></svg>; }
