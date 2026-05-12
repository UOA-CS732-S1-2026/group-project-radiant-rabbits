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
  /** Hide header X (e.g. finish-sprint confirm uses only buttons + backdrop). Default true. */
  showCloseButton?: boolean;
};

/** Modal confirm; optional corner close matches help-style overlays when enabled. */
export default function ConfirmOverlay({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  isConfirming = false,
  showCloseButton = true,
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
                  className="relative w-full min-w-0 rounded-2xl bg-[#F1F5F9] px-4 pb-5 pt-4 text-center shadow-xl md:px-6 md:pb-6 md:pt-5"
                >
                  {showCloseButton ? (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      disabled={isConfirming}
                      className="absolute right-3 top-3 rounded-lg p-1.5 text-brand-dark/60 transition hover:bg-brand-dark/5 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-40 md:right-4 md:top-4"
                    >
                      <X className="h-5 w-5" aria-hidden />
                    </button>
                  ) : null}
                  <h2
                    id={headingId}
                    className={
                      showCloseButton
                        ? "mx-auto max-w-[22rem] px-8 text-h3 font-bold leading-snug text-brand-dark md:max-w-none md:px-10"
                        : "mx-auto max-w-[22rem] text-h3 font-bold leading-snug text-brand-dark md:max-w-none"
                    }
                  >
                    {title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-[22rem] text-(length:--text-body-md) leading-relaxed text-brand-dark/90 md:max-w-none">
                    {description}
                  </p>
                  <div className="mt-6 flex flex-col-reverse items-center justify-center gap-3 sm:flex-row sm:gap-md">
                    <Button
                      type="button"
                      variant="grey"
                      size="sm"
                      className="w-full min-w-[8rem] max-w-[14rem] sm:w-auto"
                      onClick={onClose}
                      disabled={isConfirming}
                    >
                      {cancelLabel}
                    </Button>
                    <Button
                      type="button"
                      variant="purple"
                      size="sm"
                      className="w-full min-w-[8rem] max-w-[14rem] sm:w-auto"
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
