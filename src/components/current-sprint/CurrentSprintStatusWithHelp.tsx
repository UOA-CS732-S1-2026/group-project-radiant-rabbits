import GitHubIterationGuidanceCallout from "@/components/shared/GitHubIterationGuidanceCallout";
import GitHubIterationGuidanceContent from "@/components/shared/GitHubIterationGuidanceContent";
import PageContainer from "@/components/shared/PageContainer";
import type { GitHubIterationGuidanceVariant } from "@/lib/githubProjectDocs";

type CurrentSprintStatusWithHelpProps = {
  message: string;
  /** Same copy and styling as the dashboard when sprint velocity has no chart data. */
  iterationGuidanceVariant?: GitHubIterationGuidanceVariant;
};

export default function CurrentSprintStatusWithHelp({
  message,
  iterationGuidanceVariant,
}: CurrentSprintStatusWithHelpProps) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-md">
          <h1 className="text-h2 font-bold text-brand-dark">Current sprint</h1>
          {iterationGuidanceVariant ? (
            <GitHubIterationGuidanceCallout title="Sprint velocity needs GitHub iterations">
              <GitHubIterationGuidanceContent
                variant={iterationGuidanceVariant}
                textSize="relaxed"
              />
            </GitHubIterationGuidanceCallout>
          ) : (
            <p className="text-body-md text-brand-dark/70">{message}</p>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
