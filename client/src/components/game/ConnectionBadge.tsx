import { Radio, Wifi, WifiOff } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { SocketState } from "../../hooks/useGameSocket";

export function ConnectionBadge({ state, compact = false }: { state: SocketState; compact?: boolean }) {
  if (state === "connected") {
    return (
      <Badge tone="jade" dot>
        {compact ? "En vivo" : "Sincronizado en tiempo real"}
      </Badge>
    );
  }
  if (state === "reconnecting" || state === "connecting") {
    return (
      <Badge tone="amber" dot>
        {state === "connecting" ? "Conectando" : "Reconectando"}
      </Badge>
    );
  }
  if (state === "offline") {
    return (
      <Badge tone="danger" dot>
        Sin conexión
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" dot>
      Local
    </Badge>
  );
}

export function PresenceDot({ connected }: { connected: boolean }) {
  return connected ? (
    <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-jade">
      <Wifi className="h-3 w-3" aria-hidden="true" /> En línea
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-medium text-parchment-faint">
      <WifiOff className="h-3 w-3" aria-hidden="true" /> Desconectado
    </span>
  );
}

export function LivePulse({ label = "En directo" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-jade">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jade opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-jade" />
      </span>
      <Radio className="h-3 w-3" aria-hidden="true" /> {label}
    </span>
  );
}
