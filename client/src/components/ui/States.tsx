import type { ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function Loader({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 text-parchment-dim" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  action,
}: {
  message: string;
  onRetry?: () => void;
  action?: ReactNode;
}) {
  return (
    <div className="glass mx-auto my-10 max-w-lg rounded-3xl p-8 text-center">
      <p className="eyebrow mb-2">Algo no encaja</p>
      <h2 className="text-2xl text-parchment">No hemos podido continuar</h2>
      <p className="mt-3 text-sm leading-relaxed text-parchment-dim">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Reintentar
          </Button>
        ) : null}
        {action}
      </div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-soft rounded-3xl p-8 text-center sm:p-12">
      {icon ? <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-gold/20 bg-gold/5 text-gold">{icon}</div> : null}
      <h3 className="text-xl text-parchment">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-parchment-dim">{description}</p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
