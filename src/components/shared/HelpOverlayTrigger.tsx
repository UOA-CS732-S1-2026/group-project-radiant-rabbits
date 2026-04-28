"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type HelpOverlayTriggerProps = {
  /** Accessible name for the ? control (e.g. “Help for finishing group setup”). */
  label: string;
  /** Optional visible title in the white panel. */
  title?: string;
  children: React.ReactNode;
  /** Extra classes on the trigger wrapper (e.g. alignment). */
  className?: string;
  /** Slightly larger ? button (e.g. on dense forms). */
  size?: "default" | "comfortable";
};

/**
 * Blue “?” control that opens a dimmed backdrop and a white overlay panel.
 * Reusable anywhere; content is passed as `children`.
 */
export default function HelpOverlayTrigger({
  label,
  title,
  children,
  className = "",
  size = "default",
}: HelpOverlayTriggerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const headingId = useId();

  const close = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const overlay =
    open && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              aria-label="Close help overlay"
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-[1px] transition-opacity"
              onClick={close}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              {/* Full-width shell so flex never collapses the dialog to content width (Safari / shrink). */}
              <div className="pointer-events-auto w-full max-w-[38rem] shrink-0">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  className="max-h-[85vh] w-full min-w-0 overflow-y-auto rounded-2xl bg-[#F1F5F9] px-4 py-4 shadow-xl md:px-5 md:py-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {title ? (
                        <h2
                          id={headingId}
                          className="text-h3 font-bold leading-snug text-brand-dark"
                        >
                          {title}
                        </h2>
                      ) : (
                        <span id={headingId} className="sr-only">
                          Help
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close"
                      className="shrink-0 rounded-lg p-1.5 text-brand-dark/60 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-4 text-body-md leading-relaxed text-brand-dark/90">
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div className={`inline-flex shrink-0 ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={label}
          onClick={() => setOpen(true)}
          className={
            size === "comfortable"
              ? "flex h-11 w-11 items-center justify-center rounded-full bg-brand-primary text-body-md font-bold text-brand-dark shadow-sm transition hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:h-12 sm:w-12"
              : "flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-body-sm font-bold text-brand-dark shadow-sm transition hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark sm:h-11 sm:w-11"
          }
        >
          ?
        </button>
      </div>
      {overlay}
    </>
  );
}
