"use client";

import { X } from "lucide-react";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/shared/Button";

export type ConfirmOverlayProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isConfirming?: boolean;
};

/**
 * Dimmed backdrop + centered dialog (same shell pattern as help “?” overlay).
 * Controlled via `open`; Cancel and confirm actions are explicit buttons.
 */
export default function ConfirmOverlay({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  isConfirming = false,
}: ConfirmOverlayProps) {
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isConfirming) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, isConfirming]);

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
                if (!isConfirming) onClose();
              }}
              disabled={isConfirming}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-6">
              <div className="pointer-events-auto w-full max-w-[28rem] shrink-0">
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby={headingId}
                  className="w-full min-w-0 rounded-2xl bg-[#F1F5F9] px-4 py-4 shadow-xl md:px-5 md:py-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h2
                      id={headingId}
                      className="text-h3 font-bold leading-snug text-brand-dark"
                    >
                      {title}
                    </h2>
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      disabled={isConfirming}
                      className="shrink-0 rounded-lg p-1.5 text-brand-dark/60 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-40"
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  </div>
                  <p className="mt-3 text-body-md leading-relaxed text-brand-dark/90">
                    {description}
                  </p>
                  <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-md">
                    <Button
                      type="button"
                      variant="grey"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={onClose}
                      disabled={isConfirming}
                    >
                      {cancelLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="purple"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={onConfirm}
                      disabled={isConfirming}
                    >
                      {isConfirming ? "Working…" : confirmLabel}
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
