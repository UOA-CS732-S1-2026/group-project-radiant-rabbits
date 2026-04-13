/**
 * Shared vertical rhythm on the auth landing page: same gap between every
 * major block inside hero, features, and how-it-works sections.
 */
export const LANDING_SECTION_STACK = "flex flex-col gap-6 sm:gap-8 md:gap-10";

/** Hero only: half the vertical gap of `LANDING_SECTION_STACK` between blocks. */
export const LANDING_HERO_SECTION_STACK =
  "flex flex-col gap-3 sm:gap-4 md:gap-5";

/** Tighter stack only between section eyebrow and section title. */
export const LANDING_HEADING_INNER_STACK =
  "flex flex-col items-center gap-3 sm:gap-4";

/** Stack inside each how-it-works step (number, title, body). */
export const LANDING_STEP_INNER_STACK = "flex flex-col gap-3 sm:gap-4";
