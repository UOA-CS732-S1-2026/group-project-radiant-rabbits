import PastSprintRow, {
  type PastSprintRowData,
} from "@/components/past-sprint/PastSprintRow";
import GitHubIterationGuidanceCallout from "@/components/shared/GitHubIterationGuidanceCallout";
import PageContainer from "@/components/shared/PageContainer";

// Fetch all data required to display the past sprint metrics and pass it to the past sprint component for rendering
type PastSprintProps = {
  status: "ready" | "empty";
  statusMessage?: string;
  sprints?: PastSprintRowData[];
};

// Reusable status block so every failure surfaces in the past sprint UI
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <p className="text-body-md text-brand-dark/70">{message}</p>
      </PageContainer>
    </div>
  );
}

// Page component that shows when the past sprint data has an error
export default function PastSprint({
  status,
  statusMessage,
  sprints,
}: PastSprintProps) {
  if (status === "empty") {
    return (
      <StatusBlock message={statusMessage ?? "No past sprints available."} />
    );
  }

  const sprintList = sprints ?? [];
  const completedCount = sprintList.length;

  // Display the past sprint page with the fetched metrics
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <div className="border-b border-brand-dark/10 pb-lg">
            <h1 className="text-h2 font-bold text-brand-dark">Past Sprints</h1>
            <p className="mt-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
              {completedCount} completed
            </p>
          </div>
          {/* Past sprint rows */}
          {sprintList.length === 0 ? (
            <GitHubIterationGuidanceCallout title="No sprints yet">
              <p className="text-body-sm leading-relaxed text-brand-dark/85 sm:text-body-md">
                Once an iteration ends, it will appear here.
              </p>
            </GitHubIterationGuidanceCallout>
          ) : (
            <div>
              {sprintList.map((sprint, index) => (
                <PastSprintRow
                  key={sprint.id}
                  sprint={sprint}
                  isFirst={index === 0}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
