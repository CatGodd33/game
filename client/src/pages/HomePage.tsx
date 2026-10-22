import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Compass, LogIn, Sparkles, Swords, UsersRound } from "lucide-react";
import { LogoMark } from "../components/art/Logo";
import { LifeScene } from "../components/art/LifeScene";

const secondary = [
  { to: "/duelo?modo=unirse", label: "Tengo un código", icon: LogIn },
  { to: "/partidas", label: "Continuar una vida", icon: BookOpen },
];

export function HomePage() {
  return (
    <div className="home-v5">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Un mundo · dos vidas</p>
          <h1 className="mt-4">
            La misma vida.
            <br />
            <em>Tus decisiones.</em>
          </h1>
          <p className="home-lead">
            Naces con un país, una familia y una época que no eliges. En duelo, dos personas
            reciben exactamente el mismo mundo. Lo que cambie será lo que cada una haga con él.
          </p>
          <div className="home-actions">
            <Link className="home-cta primary" to="/nueva-vida">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              Nueva vida
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link className="home-cta duel" to="/duelo">
              <Swords className="h-5 w-5" aria-hidden="true" />
              Duelo para dos
            </Link>
          </div>
          <div className="home-links">
            {secondary.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </div>
          <p className="home-micro">
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            Sin registro. Una vida nueva empieza en menos de un minuto.
          </p>
        </div>

        <div className="home-art" aria-hidden="true">
          <div className="home-art-glow" />
          <div className="home-art-scene">
            <LifeScene stage="adultez" seed="life-duel-home" />
          </div>
          <div className="home-art-orbit orbit-a"><span /></div>
          <div className="home-art-orbit orbit-b"><span /></div>
          <div className="home-art-card">
            <LogoMark size={30} />
            <div>
              <strong>Un mundo compartido</strong>
              <span>La misma semilla. Decisiones distintas.</span>
            </div>
          </div>
          <div className="home-art-pill">
            <UsersRound className="h-4 w-4" aria-hidden="true" />
            <span>Duelo en tiempo real</span>
          </div>
        </div>
      </section>

      <section className="home-principles" aria-label="Cómo funciona">
        <article>
          <span>01</span>
          <h2>Naces sin elegir</h2>
          <p>País, época, familia y salud inicial se sortean con una semilla reproducible.</p>
        </article>
        <article>
          <span>02</span>
          <h2>El mundo es el mismo</h2>
          <p>En un duelo, ambos jugadores reciben los mismos sucesos. Solo cambian sus decisiones.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Construye una vida</h2>
          <p>Estudia, trabaja, emprende, cuida a los tuyos y llega lo más lejos que puedas.</p>
        </article>
      </section>

      <p className="home-footnote">
        Inspirado en la idea de una vida entre ocho mil millones. LIFE DUEL es una implementación
        original con datos demográficos abiertos y modelos de simulación identificados.{" "}
        <a className="home-map-link" href="/mapa-decisiones.html">
          Ver el mapa de decisiones ↗
        </a>
      </p>
    </div>
  );
}
