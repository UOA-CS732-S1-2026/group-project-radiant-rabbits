/** Copy + swatches for marketing feature tiles; grid lays out any length (e.g. 6 → 3×2). */
export type LandingFeature = {
  title: string;
  description: string;
  accentColor: string;
  /** Renders the in-app blue ? help control before the description (Tips tile). */
  usesAppHelpTrigger?: boolean;
};

export const LANDING_FEATURES = [
  {
    title: "Sprint Configuration",
    description:
      "Sprint dates come from your Project iteration field in GitHub. Each iteration is a sprint window your team already plans there.",
    accentColor: "#99D1C1",
  },
  {
    title: "Sprint review drafts",
    description:
      "When an iteration ends, Generate Sprint Review uses synced commits, PRs, and issues.",
    accentColor: "#B8A9FE",
  },
  {
    title: "Issue Tracking",
    description:
      "Project items tied to an iteration show on the current sprint. See planned versus done at a glance.",
    accentColor: "#C4D65E",
  },
  {
    title: "Sprint metrics",
    description:
      "Per-iteration velocity plus contributor activity so trends and uneven load show before the next sprint.",
    accentColor: "#7BB8FF",
  },
  {
    title: "Tips on every screen",
    description:
      "Click the '?' for more information on what that screen shows.",
    accentColor: "#9EC8F0",
    usesAppHelpTrigger: true,
  },
  {
    title: "Secure GitHub OAuth",
    description:
      "Sign in with GitHub. Only repos you connect are ever accessed.",
    accentColor: "#B8A9FE",
  },
] satisfies readonly LandingFeature[];
