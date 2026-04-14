/** Copy + swatches for marketing feature tiles — grid lays out any length (e.g. 6 → 3×2, 5 → 3+2). */
export type LandingFeature = {
  title: string;
  description: string;
  accentColor: string;
};

export const LANDING_FEATURES = [
  {
    title: "Sprint Configuration",
    description:
      "Set sprint dates; GitHub activity auto-filters to that window.",
    accentColor: "#99D1C1",
  },
  {
    title: "AI Sprint Summaries",
    description:
      "Plain language summaries per contributor, including work not tied to issues.",
    accentColor: "#B8A9FE",
  },
  {
    title: "Contributor Insights",
    description:
      "See workload balance across the team. Catch uneven load early.",
    accentColor: "#6BCF8E",
  },
  {
    title: "Issue Tracking",
    description:
      "GitHub issues mapped to your sprint. Planned vs shipped at a glance.",
    accentColor: "#C4D65E",
  },
  {
    title: "Velocity Tracking",
    description:
      "Team velocity by sprint. Spot trends and plan the next one with confidence.",
    accentColor: "#7BB8FF",
  },
  {
    title: "Secure GitHub OAuth",
    description:
      "Sign in with GitHub. Only repos you connect are ever accessed.",
    accentColor: "#B8A9FE",
  },
] as const satisfies readonly LandingFeature[];
