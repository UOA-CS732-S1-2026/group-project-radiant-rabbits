import PastSprintRow, {
  type PastSprintRowData,
} from "@/components/past-sprint/PastSprintRow";
import HelpOverlayTrigger from "@/components/shared/HelpOverlayTrigger";
import PageContainer from "@/components/shared/PageContainer";

// Fetch all data required to display the past sprint metrics and pass it to the past sprint component for rendering
type PastSprintProps = {
  status: "ready" | "empty";
  statusMessage?: string;
  sprints?: PastSprintRowData[];
  groupId?: string;
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
  groupId,
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
          <div className="flex items-start justify-between gap-md border-b border-brand-dark/10 pb-lg">
            <div>
              <h1 className="text-h2 font-bold text-brand-dark">
                Past Sprints
              </h1>
              <p className="mt-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
                {completedCount} completed
              </p>
            </div>
            <HelpOverlayTrigger
              label="Help: past sprints"
              title="What appears here"
              className="shrink-0 self-start pt-1"
            >
              <div className="space-y-3 text-left">
                <p>
                  Each row is a sprint that has{" "}
                  <span className="font-semibold">finished</span> in GitHub
                  (completed iteration), then synced into this app.
                </p>
                <p>
                  <span className="font-semibold">Click on a row</span> to go to{" "}
                  <span className="font-semibold">Sprint Review Summary</span>,
                  where a sprint review can be generated or viewed.
                </p>
                <p>
                  Commit and issue counts use that sprint&apos;s date range.
                </p>
              </div>
            </HelpOverlayTrigger>
          </div>
          {/* Past sprint rows */}
          {sprintList.length === 0 ? (
            <p className="text-body-md text-brand-dark/70">
              No sprints yet. Once an iteration ends, it will appear here.
            </p>
          ) : (
            <div>
              {sprintList.map((sprint, index) => (
                <PastSprintRow
                  key={sprint.id}
                  sprint={sprint}
                  isFirst={index === 0}
                  groupId={groupId}
                />
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </div>
  );
}
