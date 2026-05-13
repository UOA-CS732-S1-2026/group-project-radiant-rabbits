import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { getCurrentSprintData } from "@/app/lib/currentSprintService";
import CurrentSprint from "@/components/current-sprint/CurrentSprint";
import type { GitHubIterationGuidanceVariant } from "@/lib/githubProjectDocs";

type CurrentSprintStatus = "ready" | "empty" | "error";

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

  // Preserve service-level guidance variants so the UI can distinguish missing
  // GitHub iteration setup from an empty-but-configured project.
  if (body.error) {
    status = "error";
    statusMessage = body.error;
  } else if (!body.sprint) {
    status = "empty";
    statusMessage = body.message;
    iterationGuidanceVariant = body.iterationGuidanceVariant;
  }

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
