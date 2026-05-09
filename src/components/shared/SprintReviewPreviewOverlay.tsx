"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/shared/Button";

export type SprintReviewPreviewOverlayProps = {
  open: boolean;
  onContinue: () => void;
  onDismiss: () => void;
  reviewText?: string;
  sprintName?: string;
  dateRange?: string;
  isLoading?: boolean;
};

/** Placeholder sprint review body until generation/API exists. */
export default function SprintReviewPreviewOverlay({
  open,
  onContinue,
  onDismiss,
  reviewText,
  sprintName,
  dateRange,
  isLoading,
}: SprintReviewPreviewOverlayProps) {
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onDismiss]);

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
          <div className="fixed inset-0 z-[101]">
            <button
              type="button"
              aria-label="Close preview"
              className="absolute inset-0 bg-brand-dark/60 backdrop-blur-[1px] transition-opacity"
              onClick={onDismiss}
            />
            <div className="pointer-events-none absolute inset-0 grid place-items-center p-3 sm:p-4 md:p-5">
              <div className="pointer-events-auto w-full max-w-[min(96vw,72rem)] min-w-[min(100%,18rem)]">
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  className="relative flex max-h-[min(92vh,56rem)] w-full flex-col overflow-hidden rounded-2xl bg-[#E2E8F0] text-left shadow-2xl ring-1 ring-brand-dark/10"
                >
                  <div className="flex shrink-0 items-start justify-between gap-3 border-b border-brand-dark/10 bg-[#F1F5F9] px-4 pb-3 pt-4 sm:px-6 sm:pt-5">
                    <h2
                      id={headingId}
                      className="min-w-0 flex-1 text-h3 font-bold leading-snug text-brand-dark"
                    >
                      Sprint review (preview)
                    </h2>
                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                      <Button
                        type="button"
                        variant="white"
                        size="sm"
                        className="gap-1.5 !border-brand-dark/15 shadow-none transition-colors hover:!bg-slate-100 active:!bg-slate-200"
                        aria-label="Export sprint review"
                        onClick={() => {}}
                      >
                        <Download
                          className="h-4 w-4 shrink-0 opacity-90"
                          aria-hidden
                        />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </div>
                  </div>

                  <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#E2E8F0] px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4">
                    <div className="mx-auto min-h-[min(65vh,44rem)] w-full max-w-[68rem] rounded-lg border border-brand-dark/15 bg-brand-surface px-6 py-8 shadow-sm sm:px-10 sm:py-10 md:px-14 md:py-12">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-brand-dark/50">
                            Generating review content...
                          </p>
                        </div>
                      ) : (
                        <>
                          <p className="text-body-md font-medium text-brand-dark/85">
                            {sprintName || "Sprint Review"}
                          </p>
                          <p className="mt-1 text-body-md text-brand-dark/60">
                            {dateRange}
                          </p>

                          <div className="mt-8 border-t border-brand-dark/5 pt-6">
                            {/* Use whitespace-pre-wrap to preserve formatting from the AI */}
                            <pre className="whitespace-pre-wrap font-sans text-body-md leading-relaxed text-brand-dark/90">
                              {reviewText || "No review content available."}
                            </pre>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 border-t border-brand-dark/10 bg-[#F1F5F9] px-4 py-4 sm:px-6">
                    <p className="mx-auto max-w-[36rem] text-center text-body-sm leading-relaxed text-brand-dark/75">
                      This sprint review is saved—you can open it anytime from{" "}
                      <Link
                        href="/past-sprints"
                        className="font-medium text-brand-primary underline decoration-brand-primary/40 underline-offset-2 transition hover:opacity-90"
                      >
                        Past Sprints
                      </Link>
                      .
                    </p>
                    <div className="mt-4 flex justify-center">
                      <Button
                        type="button"
                        variant="purple"
                        size="sm"
                        onClick={onContinue}
                      >
                        Continue
                      </Button>
                    </div>
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
