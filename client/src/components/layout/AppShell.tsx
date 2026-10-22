import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { BookHeart, History, Menu, Plus, Settings, X } from "lucide-react";
import { APP_VERSION } from "@life-duel/shared";
import { Logo } from "../art/Logo";
import { cn } from "../../lib/utils";
import { buttonClasses } from "../ui/Button";

const NAV_ITEMS = [
  { to: "/partidas", label: "Mis vidas", icon: BookHeart },
  { to: "/historial", label: "Historial", icon: History },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#contenido"
        className="fixed left-4 top-4 z-[70] -translate-y-24 rounded-xl bg-gold px-4 py-2 font-semibold text-ink-950 transition focus:translate-y-0"
      >
        Saltar al contenido
      </a>

      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-ink-950/70 backdrop-blur-2xl">
        <div className="container-page flex h-[4.5rem] items-center justify-between gap-4">
          <Link to="/" aria-label="LIFE DUEL, ir al inicio" className="rounded-xl">
            <Logo size={36} />
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-white/[0.07] text-parchment"
                        : "text-parchment-dim hover:bg-white/[0.04] hover:text-parchment",
                    )
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
            <Link to="/nueva-vida" className={buttonClasses("primary", "sm", "ml-2")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Nueva vida
            </Link>
          </nav>

          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 text-parchment md:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu-movil"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen ? (
          <div id="menu-movil" className="border-t border-white/[0.07] px-4 pb-4 pt-2 md:hidden">
            <nav aria-label="Navegación móvil" className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                        isActive ? "bg-white/[0.07] text-parchment" : "text-parchment-dim",
                      )
                    }
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                );
              })}
              <Link to="/nueva-vida" className={buttonClasses("primary", "md", "mt-2 w-full")}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Nueva vida
              </Link>
            </nav>
          </div>
        ) : null}
      </header>

      <main id="contenido" className="flex-1 pb-16">
        {children}
      </main>

      <footer className="border-t border-white/[0.06] bg-ink-950/50">
        <div className="container-page flex flex-col gap-4 py-7 text-xs text-parchment-faint sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Logo size={24} showWordmark={false} />
            <span>Simulación con reglas transparentes. No sustituye asesoramiento médico ni financiero.</span>
          </div>
          <span className="tracking-[0.1em]">VERSIÓN {APP_VERSION} · DATOS DEMOGRÁFICOS ABIERTOS</span>
        </div>
      </footer>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {back ? <div className="mb-3">{back}</div> : null}
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-balance text-3xl leading-tight text-parchment sm:text-4xl md:text-5xl">{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-parchment-dim sm:text-base">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
