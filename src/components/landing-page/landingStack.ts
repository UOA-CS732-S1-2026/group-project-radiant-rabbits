/**
 * Medium stack gap: sections 2–3 (features, how-it-works) use this between
 * heading → content → CTA, and for grids (feature cards, steps) so rhythm matches.
 */
export const LANDING_BLOCK_GAP = "gap-8 sm:gap-10 md:gap-12";

/**
 * Vertical stack for features / how-it-works inner layout (and heading → grid → button).
 */
export const LANDING_SECTION_STACK = `flex flex-col ${LANDING_BLOCK_GAP}`;

/** Section 1 (hero) only: tighter vertical gap than `LANDING_SECTION_STACK`. */
export const LANDING_HERO_SECTION_STACK =
  "flex flex-col gap-4 sm:gap-5 md:gap-6";

/** Section eyebrow labels (e.g. “Features”): small label treatment. */
export const LANDING_SECTION_EYEBROW_TEXT_CLASS =
  "text-body-sm font-bold uppercase tracking-[0.14em] text-brand-dark";

/**
 * Hero lead under the display title: subtitle scale, semibold, softened colour
 * so it supports the gradient wordmark instead of competing with it.
 */
export const LANDING_HERO_LEAD_TEXT_CLASS =
  "text-body-md font-semibold leading-relaxed text-brand-dark/85";

/** Tighter stack only between section eyebrow and section title. */
export const LANDING_HEADING_INNER_STACK =
  "flex flex-col items-center gap-3 sm:gap-4";

/** Stack inside each how-it-works step (number, title, body). */
export const LANDING_STEP_INNER_STACK = "flex flex-col gap-3 sm:gap-4";

/** Step grid gap — same scale as `LANDING_BLOCK_GAP`. */
export const LANDING_STEP_GRID_GAP = LANDING_BLOCK_GAP;

/** Feature card flex-wrap grid — same scale as `LANDING_BLOCK_GAP`. */
export const LANDING_FEATURE_GRID_GAP = LANDING_BLOCK_GAP;

/** Primary GitHub CTA on light surfaces (hero card). */
export const LANDING_SIGN_IN_BUTTON_PRIMARY_CLASS =
  "rounded-xl bg-brand-accent/70 px-6 py-3 text-(length:--text-body-sm) font-semibold text-brand-dark shadow-md transition hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-dark";

/** Outline GitHub CTA on dark navy (closing card). */
export const LANDING_SIGN_IN_BUTTON_OUTLINE_ON_DARK_CLASS =
  "rounded-xl border-2 border-none bg-brand-accent/70 px-5 py-2.5 text-(length:--text-body-sm) font-semibold text-black transition hover:brightness-105 active:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6 sm:py-3";
