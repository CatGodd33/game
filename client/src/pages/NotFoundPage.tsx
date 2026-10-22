import { Link } from "react-router-dom";
import { Compass, Home, Swords } from "lucide-react";
import { LogoMark } from "../components/art/Logo";
import { buttonClasses } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function NotFoundPage() {
  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <Card className="max-w-lg p-8 text-center">
        <LogoMark size={64} className="mx-auto" />
        <p className="eyebrow mt-5">Error 404</p>
        <h1 className="mt-2 text-3xl text-parchment">Este camino no existe</h1>
        <p className="mt-3 text-sm leading-relaxed text-parchment-dim">
          La página que buscas no forma parte de esta vida. Puedes volver al inicio, revisar tus partidas
          o empezar un duelo nuevo.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/" className={buttonClasses("primary", "md")}>
            <Home className="h-4 w-4" /> Inicio
          </Link>
          <Link to="/partidas" className={buttonClasses("secondary", "md")}>
            <Compass className="h-4 w-4" /> Mis vidas
          </Link>
          <Link to="/duelo" className={buttonClasses("ghost", "md")}>
            <Swords className="h-4 w-4" /> Duelo
          </Link>
        </div>
      </Card>
    </div>
  );
}
