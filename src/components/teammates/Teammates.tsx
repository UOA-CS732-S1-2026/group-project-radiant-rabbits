import PageContainer from "@/components/shared/PageContainer";
import LeaveGroupButton from "@/components/teammates/leaveGroupButton";
import TeammateRow, {
  type TeammateRowData,
} from "@/components/teammates/TeammateRow";

// Fetch all data required to display the team members and pass it to the teammates component for rendering
type TeammatesProps = {
  status: "ready" | "empty";
  statusMessage?: string;
  members?: TeammateRowData[];
};

// Reusable status block so every failure surfaces in the teammates UI
function StatusBlock({ message }: { message: string }) {
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <p className="text-(length:--text-body-md) text-brand-dark/70">
          {message}
        </p>
      </PageContainer>
    </div>
  );
}

// Page component that shows when the teammates data has an error
export default function Teammates({
  status,
  statusMessage,
  members,
}: TeammatesProps) {
  if (status === "empty") {
    return <StatusBlock message={statusMessage ?? "No teammates available."} />;
  }

  const memberList = members ?? [];
  const memberCount = memberList.length;

  // Display the teammates page with the fetched members
  return (
    <div className="min-h-full bg-brand-background">
      <PageContainer>
        <div className="space-y-lg">
          <div className="flex items-start justify-between gap-md border-b border-brand-dark/10 pb-lg">
            <div>
              <h1 className="text-(length:--text-h2) font-bold text-brand-dark">
                Teammates
              </h1>
              {memberCount > 0 && (
                <p className="mt-xs text-(length:--text-body-xs) font-semibold uppercase tracking-[0.14em] text-brand-accent">
                  {memberCount} member{memberCount === 1 ? "" : "s"}
                </p>
              )}
            </div>
            {/* Leave button */}
            <LeaveGroupButton />
          </div>
          {/* Teammate rows */}
          {memberList.length === 0 ? (
            <p className="text-(length:--text-body-md) text-brand-dark/70">
              No teammates found in this group yet.
            </p>
          ) : (
            <div>
              {memberList.map((person, index) => (
                <TeammateRow
                  key={person.id}
                  person={person}
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
