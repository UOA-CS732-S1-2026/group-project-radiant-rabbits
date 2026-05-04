"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/shared/Button";

export type SprintWelcomeOverlayProps = {
  open: boolean;
  onClose: () => void;
  /** Receives trimmed sprint focus text when the user continues. */
  onContinue: (sprintFocus: string) => void;
  /** Shown in the title as “Welcome to sprint #…”. */
  sprintNumber: number;
  /** Short intro above the sprint focus field. */
  description?: string;
  isContinuing?: boolean;
};

/**
 * Same shell as {@link ConfirmOverlay} (centered card; backdrop/Escape dismiss).
 * Shown after Skip / preview Continue — welcomes the next sprint; collects sprint focus for a later API.
 */
export default function SprintWelcomeOverlay({
  open,
  onClose,
  onContinue,
  sprintNumber,
  description = "Add a short focus for the sprint ahead. You can refine it later on the board.",
  isContinuing = false,
}: SprintWelcomeOverlayProps) {
  const headingId = useId();
  const focusFieldId = useId();
  const title = `Welcome to sprint #${sprintNumber}`;
  const [sprintFocus, setSprintFocus] = useState("");

  useEffect(() => {
    if (open) setSprintFocus("");
  }, [open]);

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
                  <h2
                    id={headingId}
                    className="mx-auto max-w-[22rem] text-h3 font-bold leading-snug text-brand-dark md:max-w-none"
                  >
                    {title}
                  </h2>
                  <p className="mx-auto mt-3 max-w-[22rem] text-body-md leading-relaxed text-brand-dark/90 md:max-w-none">
                    {description}
                  </p>
                  <div className="mx-auto mt-5 w-full max-w-[22rem] text-left md:max-w-none">
                    <label
                      htmlFor={focusFieldId}
                      className="text-body-sm font-semibold text-brand-dark"
                    >
                      Sprint focus
                    </label>
                    <textarea
                      id={focusFieldId}
                      rows={3}
                      value={sprintFocus}
                      onChange={(e) => setSprintFocus(e.target.value)}
                      placeholder="e.g. Ship the GitHub sync MVP and stabilize CI"
                      disabled={isContinuing}
                      className="mt-1 min-h-[5.5rem] w-full resize-y rounded-xl border border-brand-accent bg-brand-surface px-md py-md text-body-sm text-brand-dark outline-none placeholder:text-brand-dark/40 focus:ring-2 focus:ring-brand-primary disabled:opacity-60"
                    />
                  </div>
                  <div className="mt-6 flex justify-center">
                    <Button
                      type="button"
                      variant="purple"
                      size="sm"
                      className="w-full min-w-[8rem] max-w-[14rem] sm:w-auto"
                      onClick={() => onContinue(sprintFocus.trim())}
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
