"use client";

import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/shared/Button";

export type SprintWelcomeOverlayProps = {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  /** Shown in the title as “Welcome to sprint #…”. */
  sprintNumber: number;
  /** Static body until the summary prompt ships in a follow-up. */
  description?: string;
  isContinuing?: boolean;
};

/**
 * Same shell as {@link ConfirmOverlay} (centered card, Cancel + primary).
 * Shown after Skip / preview Continue — welcomes the next sprint; summary UI comes later.
 */
export default function SprintWelcomeOverlay({
  open,
  onClose,
  onContinue,
  sprintNumber,
  description = "You’ll be prompted for a one–two sentence summary of what this sprint will cover in a follow-up change. Continue finishes the hand-off for now.",
  isContinuing = false,
}: SprintWelcomeOverlayProps) {
  const headingId = useId();
  const title = `Welcome to sprint #${sprintNumber}`;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isContinuing) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isContinuing]);

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
              aria-label="Close dialog"
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-[1px] transition-opacity disabled:cursor-not-allowed"
              onClick={() => {
                if (!isContinuing) onClose();
              }}
              disabled={isContinuing}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="pointer-events-auto w-full max-w-[28rem] shrink-0">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  className="relative w-full min-w-0 rounded-2xl bg-[#F1F5F9] px-4 pb-5 pt-4 text-center shadow-xl md:px-6 md:pb-6 md:pt-5"
                >
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    disabled={isContinuing}
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-brand-dark/60 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-40 md:right-4 md:top-4"
                  >
                    <X className="h-5 w-5" aria-hidden />
                  </button>
                  <h2
                    id={headingId}
                    className="mx-auto max-w-[22rem] px-8 text-h3 font-bold leading-snug text-brand-dark md:max-w-none md:px-10"
                  >
                    {title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-[22rem] text-body-md leading-relaxed text-brand-dark/90 md:max-w-none">
                    {description}
                  </p>
                  <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row sm:gap-md">
                    <Button
                      type="button"
                      variant="grey"
                      size="sm"
                      className="w-full min-w-[8rem] max-w-[14rem] sm:w-auto"
                      onClick={onClose}
                      disabled={isContinuing}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="purple"
                      size="sm"
                      className="w-full min-w-[8rem] max-w-[14rem] sm:w-auto"
                      onClick={onContinue}
                      disabled={isContinuing}
                    >
                      {isContinuing ? "Working…" : "Continue"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return overlay;
}
