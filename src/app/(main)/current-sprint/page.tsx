import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { getCurrentSprintData } from "@/app/lib/currentSprintService";
import CurrentSprint from "@/components/current-sprint/CurrentSprint";
import type { GitHubIterationGuidanceVariant } from "@/lib/githubProjectDocs";

type CurrentSprintStatus = "ready" | "empty" | "error";

// Fetch all data required to display the current sprint metrics
export default async function CurrentSprintPage() {
  const session = await getServerSession(options);
  const isTestMode = process.env.TEST_MODE === "true";

  if (!session?.user) {
    redirect("/");
  }

  if (isTestMode) {
    return (
      <CurrentSprint
        status="empty"
        statusMessage="Test mode current sprint placeholder."
      />
    );
  }

  const { body } = await getCurrentSprintData();

  let status: CurrentSprintStatus = "ready";
  let statusMessage: string | undefined;
  let iterationGuidanceVariant: GitHubIterationGuidanceVariant | undefined;

  // Determine status and message based on the errors
  if (body.error) {
    status = "error";
    statusMessage = body.error;
  } else if (!body.sprint) {
    status = "empty";
    statusMessage = body.message;
    iterationGuidanceVariant = body.iterationGuidanceVariant;
  }

  // Display the current sprint page with the fetched metrics
  return (
    <CurrentSprint
      status={status}
      statusMessage={statusMessage}
      iterationGuidanceVariant={iterationGuidanceVariant}
      groupId={body.group?.id}
      groupName={body.group?.name}
      sprint={body.sprint ?? undefined}
      metrics={body.metrics}
    />
  );
}
