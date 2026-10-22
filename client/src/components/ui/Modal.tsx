import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Modal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    size = "md",
    dismissible = true,
}: {
    open: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: "sm" | "md" | "lg";
    dismissible?: boolean;
}) {
    const titleId = useId();
    const descriptionId = useId();
    const panelRef = useRef<HTMLDivElement>(null);
    const restoreFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        restoreFocus.current = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        const previousPadding = document.body.style.paddingRight;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = "hidden";
        document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : previousPadding;
        const focusable = panelRef.current?.querySelector<HTMLElement>(
            "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        );
        focusable?.focus();

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && dismissible) {
                event.preventDefault();
                onClose();
                return;
            }
            if (event.key !== "Tab" || !panelRef.current) return;
            const elements = Array.from(
                panelRef.current.querySelectorAll<HTMLElement>(
                    "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
                ),
            ).filter((element) => element.offsetParent !== null);
            if (elements.length === 0) return;
            const first = elements[0];
            const last = elements[elements.length - 1];
            if (!first || !last) return;
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPadding;
            restoreFocus.current?.focus?.();
        };
    }, [open, onClose, dismissible]);

    if (!open) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
            <button
                type="button"
                aria-label="Cerrar"
                className="absolute inset-0 cursor-default bg-ink-950/80 backdrop-blur-sm"
                onClick={dismissible ? onClose : undefined}
                tabIndex={-1}
            />
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descriptionId : undefined}
                className={cn(
                    "glass relative z-10 max-h-[calc(100dvh-0.5rem)] w-full overflow-y-auto overscroll-contain rounded-t-3xl border-b-0 p-5 shadow-panel animate-fade-up sm:max-h-[92vh] sm:rounded-3xl sm:border-b sm:p-7",
                    size === "sm" && "sm:max-w-md",
                    size === "md" && "sm:max-w-2xl",
                    size === "lg" && "sm:max-w-4xl",
                )}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <h2 id={titleId} className="text-2xl text-parchment">
                            {title}
                        </h2>
                        {description ? (
                            <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-parchment-dim">
                                {description}
                            </p>
                        ) : null}
                    </div>
                    {dismissible ? (
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-white/10 p-2 text-parchment-dim transition hover:bg-white/10 hover:text-parchment"
                            aria-label="Cerrar ventana"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    ) : null}
                </div>
                {children}
                {footer ? <div className="mt-6 border-t border-white/10 pt-5">{footer}</div> : null}
            </div>
        </div>,
        document.body,
    );
}
