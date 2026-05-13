"use client";

import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/shared/Button";

export type SprintReviewPromptOverlayProps = {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;
  onGenerateSprintReview: () => void;
  title?: string;
  description?: string;
};

/** Shown after “finish sprint” confirm; Generate opens the preview overlay. */
export default function SprintReviewPromptOverlay({
  open,
  onClose,
  onSkip,
  onGenerateSprintReview,
  title = "Sprint complete",
  description = "Generate a sprint review to summarize what shipped this sprint and what’s next for your team.",
}: SprintReviewPromptOverlayProps) {
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Freeze the page behind the modal so the finish-sprint flow feels like one
    // focused decision sequence.
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
              aria-hidden="true"
              tabIndex={-1}
              onClick={onClose}
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-[1px] transition-opacity"
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="pointer-events-auto w-full max-w-[28rem] shrink-0">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  className="relative w-full min-w-0 rounded-2xl bg-[#F1F5F9] px-4 pb-5 pt-4 text-center shadow-xl md:px-6 md:pb-6 md:pt-5"
                >
                  <h2
                    id={headingId}
                    className="mx-auto max-w-[22rem] text-h3 font-bold leading-snug text-brand-dark md:max-w-none"
                  >
                    {title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-[22rem] text-(length:--text-body-md) leading-relaxed text-brand-dark/90 md:max-w-none">
                    {description}
                  </p>
                  <div className="mt-6 flex flex-col items-center justify-center gap-3">
                    <Button
                      type="button"
                      size="lg"
                      onClick={onGenerateSprintReview}
                    >
                      Generate Sprint Review
                    </Button>
                    <Button
                      type="button"
                      variant="grey"
                      size="sm"
                      onClick={onSkip}
                    >
                      Skip
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
