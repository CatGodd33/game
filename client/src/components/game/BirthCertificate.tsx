import type { GameView } from "@life-duel/shared";
import { BirthMap } from "../art/BirthMap";
import { PixelPortrait } from "../art/PixelLife";
import { useToast } from "../ui/ToastProvider";

const money = (n: number) =>
  new Intl.NumberFormat("es", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/**
 * Registro de nacimiento intencionadamente breve: identidad, lugar, familia y
 * poco más. Los indicadores macro y las comparaciones no forman parte de la
 * experiencia de juego y se han retirado de esta pantalla.
 */
export function BirthCertificate({
  game,
  busy,
  onBegin,
  embedded = false,
}: {
  game: GameView;
  busy?: boolean;
  onBegin?: () => void;
  embedded?: boolean;
}) {
  const b = game.world.birth;
  const d = b.details;
  const toast = useToast();
  const month = new Date(2000, (d?.month ?? 1) - 1).toLocaleString("es", { month: "long" });
  const summary = `En ${month} de ${b.year}, naciste ${b.sex === "female" ? "niña" : "niño"} en ${b.location}, ${b.countryName}. ${d?.siblings.length ? `Te esperaban ${d.siblings.length} hermanos mayores.` : "Eres el primer hijo de tu familia."}`;

  async function share() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 780;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo crear la tarjeta.");
      const gradient = ctx.createLinearGradient(0, 0, 1200, 780);
      gradient.addColorStop(0, "#0b1b2b");
      gradient.addColorStop(1, "#143b45");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 780);
      ctx.strokeStyle = "#74e0c1";
      ctx.strokeRect(35, 35, 1130, 710);
      ctx.fillStyle = "#8eb2ad";
      ctx.font = "18px monospace";
      ctx.fillText(`REGISTRO DE NACIMIENTO · ${d?.registrationId ?? b.countryCode}`, 75, 100);
      ctx.fillStyle = "#f4f0e6";
      ctx.font = "bold 64px Georgia";
      ctx.fillText(`${b.givenName} ${b.surname}`, 75, 210);
      ctx.fillStyle = "#74e0c1";
      ctx.font = "30px Georgia";
      ctx.fillText(`${b.location} · ${b.countryName}`, 75, 275);
      ctx.fillStyle = "#c3d3ce";
      ctx.font = "24px sans-serif";
      [
        `${month} de ${b.year} · ${b.sex === "female" ? "Mujer" : "Hombre"}`,
        `${b.family.label}`,
        `Madre: ${d?.mother.name ?? "—"}`,
        `Padre: ${d?.father.name ?? "—"}`,
        "Una vida al azar. Una historia por escribir.",
      ].forEach((line, i) => ctx.fillText(line, 75, 360 + i * 52));
      ctx.font = "18px sans-serif";
      ctx.fillStyle = "#829d99";
      ctx.fillText("LIFE DUEL", 75, 700);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((v) => (v ? resolve(v) : reject(new Error("No se pudo generar la tarjeta."))), "image/png"),
      );
      const file = new File([blob], `nacimiento-${b.givenName}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `La vida de ${b.givenName}` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.push("No se pudo compartir la tarjeta.", "error");
      }
    }
  }

  const items: [string, string][] = [
    ["Sexo", b.sex === "female" ? "Mujer" : "Hombre"],
    ["País", b.countryName],
    ["Lugar", `${b.location}${d?.rural ? " · campo" : " · ciudad"}`],
    ["Familia", b.family.label],
    ...(d
      ? ([
          ["Madre", `${d.mother.name}, ${d.mother.age} años`],
          ["Padre", `${d.father.name}, ${d.father.age} años`],
          ["Vivienda", d.housing],
          ["Ingresos familiares", `${money(d.annualHouseholdIncome)} PPP`],
        ] as [string, string][])
      : []),
  ];

  return (
    <div className={`certificate ${embedded ? "certificate-embedded" : ""}`}>
      <div className="certificate-top">
        <span>Registro de nacimiento</span>
        <span>N.º {d?.registrationId ?? `${b.countryCode}-${b.year}`}</span>
      </div>
      <div className="certificate-body">
        <div className="certificate-title">
          <PixelPortrait birth={b} />
          <div>
            <p className="story-eyebrow">Nombre</p>
            <h1>{b.givenName} <em>{b.surname}</em></h1>
          </div>
        </div>
        <p className="certificate-summary">{summary}</p>
        <div className="certificate-columns">
          <dl className="certificate-facts">
            {items.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <div className="certificate-location">
            <p className="story-eyebrow">Tu lugar en el mundo</p>
            <BirthMap code={b.countryCode} name={b.countryName} />
            <div className="certificate-quote">«No elegimos dónde empieza nuestra historia.»</div>
          </div>
        </div>
        {!embedded && (
          <div className="certificate-actions">
            <button className="story-button" onClick={() => void share()}>↗ Compartir tarjeta</button>
            <button className="story-button primary" onClick={onBegin} disabled={busy}>
              {busy ? "Abriendo tu vida…" : "Comenzar esta vida →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
