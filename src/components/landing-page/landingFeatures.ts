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
      "Define sprint start/end dates. GitHub activity is automatically filtered to the selected period.",
    accentColor: "#99D1C1",
  },
  {
    title: "AI Sprint Summaries",
    description:
      "Plain-language summaries of each contributor's work, including invisible work not linked to issues.",
    accentColor: "#B8A9FE",
  },
  {
    title: "Contributor Insights",
    description:
      "Visualise workload balance across the team. Spot uneven distributions early.",
    accentColor: "#6BCF8E",
  },
  {
    title: "Issue Tracking",
    description:
      "GitHub issues mapped to your sprint. See exactly what was planned vs. what shipped.",
    accentColor: "#C4D65E",
  },
  {
    title: "Velocity Tracking",
    description:
      "Sprint-by-sprint velocity chart shows momentum over time to improve future planning.",
    accentColor: "#7BB8FF",
  },
  {
    title: "Secure GitHub OAuth",
    description:
      "Sign in directly with GitHub. Only accesses repositories you explicitly connect.",
    accentColor: "#B8A9FE",
  },
] as const satisfies readonly LandingFeature[];
