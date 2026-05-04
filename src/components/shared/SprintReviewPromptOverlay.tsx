"use client";

import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";

export type SprintReviewPromptOverlayProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

/**
 * Same shell as {@link ConfirmOverlay}: portal, dimmed backdrop, centered card.
 * Shown after finishing a sprint (copy-only for now; dismiss via X / backdrop / Escape).
 */
export default function SprintReviewPromptOverlay({
  open,
  onClose,
  title = "Sprint complete",
  description = "Generate a sprint review to summarize what shipped this sprint and what’s next for your team.",
}: SprintReviewPromptOverlayProps) {
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-[1px] transition-opacity"
              onClick={onClose}
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
                    className="absolute right-3 top-3 rounded-lg p-1.5 text-brand-dark/60 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary md:right-4 md:top-4"
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
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return overlay;
}
