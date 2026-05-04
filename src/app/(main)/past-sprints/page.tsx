import type mongoose from "mongoose";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import {
  Commit,
  Group,
  Issue,
  PullRequest,
  Sprint,
  User,
} from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

type PastSprintRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  commits: number;
  issuesClosed: number;
  pullRequestsMerged: number;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Load completed sprints with per-sprint commit and closed-issue counts.
async function loadPastSprints(
  groupId: mongoose.Types.ObjectId,
): Promise<PastSprintRow[]> {
  const sprints = await Sprint.find({
    group: groupId,
    status: "COMPLETED",
  })
    .sort({ endDate: -1 })
    .lean<
      Array<{
        _id: mongoose.Types.ObjectId;
        name: string;
        startDate: Date;
        endDate: Date;
        goal: string | null;
      }>
    >();

  return Promise.all(
    sprints.map(async (sprint) => {
      const [commits, issuesClosed, pullRequestsMerged] = await Promise.all([
        Commit.countDocuments({
          group: groupId,
          date: { $gte: sprint.startDate, $lte: sprint.endDate },
        }),
        Issue.countDocuments({
          group: groupId,
          state: "CLOSED",
          closedAt: { $gte: sprint.startDate, $lte: sprint.endDate },
        }),
        PullRequest.countDocuments({
          group: groupId,
          state: "MERGED",
          mergedAt: { $gte: sprint.startDate, $lte: sprint.endDate },
        }),
      ]);

      return {
        id: String(sprint._id),
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        summary: sprint.goal ?? "",
        commits,
        issuesClosed,
        pullRequestsMerged,
      };
    }),
  );
}

function SprintSummaryStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-brand-background px-md py-sm">
      <p className="text-body-xs font-medium text-brand-dark/60">{label}</p>
      <p className="mt-xs text-body-md font-semibold text-brand-dark">
        {value}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card className="border border-brand-dark/10 border-l-0 shadow-none">
      <BorderedPanel className="p-lg">
        <p className="text-body-md text-brand-dark/70">{message}</p>
      </BorderedPanel>
    </Card>
  );
}

export default async function PastSprintsPage() {
  const session = await getServerSession(options);
  if (!session?.user) {
    redirect("/");
  }

  await connectMongoDB();

  const user = await User.findOne({ githubId: session.user.id }).select(
    "currentGroupId",
  );

  if (!user?.currentGroupId) {
    return (
      <PageContainer>
        <SectionHeading
          title="Past Sprints"
          subtitle="Browse completed sprints and review key delivery details."
        />
        <EmptyState message="No group selected. Create or join a group to see past sprints." />
      </PageContainer>
    );
  }

  const group = await Group.findById(user.currentGroupId).select(
    "_id iterationFieldConfigured",
  );
  if (!group) {
    return (
      <PageContainer>
        <SectionHeading
          title="Past Sprints"
          subtitle="Browse completed sprints and review key delivery details."
        />
        <EmptyState message="Current group not found." />
      </PageContainer>
    );
  }

  const pastSprints = await loadPastSprints(group._id);

  // Look up the next upcoming sprint so we can show a banner when nothing is active today.
  const now = new Date();
  const upcomingSprint = await Sprint.findOne({
    group: group._id,
    endDate: { $gte: now },
  })
    .sort({ startDate: 1 })
    .select("name startDate endDate")
    .lean<{ name: string; startDate: Date; endDate: Date }>();

  const nextSprintBanner =
    upcomingSprint && upcomingSprint.startDate > now
      ? `Next iteration "${upcomingSprint.name}" starts on ${formatDate(upcomingSprint.startDate)}.`
      : null;

  const setupHint =
    group.iterationFieldConfigured === false
      ? "This repo's GitHub Project doesn't have an iteration field yet — past sprints will appear here once you add one and assign tickets to it."
      : null;

  return (
    <PageContainer>
      <SectionHeading
        title="Past Sprints"
        subtitle="Browse completed sprints and review key delivery details."
      />

      {nextSprintBanner ? (
        <div className="mb-md rounded-xl border border-brand-accent/40 bg-brand-accent/10 px-md py-sm text-body-sm text-brand-dark">
          {nextSprintBanner}
        </div>
      ) : null}

      {setupHint ? (
        <div className="mb-md rounded-xl border border-brand-dark/10 bg-brand-surface px-md py-sm text-body-sm text-brand-dark/70">
          {setupHint}
        </div>
      ) : null}

      <Card className="border border-brand-dark/10 border-l-0 shadow-none">
        <BorderedPanel className="p-lg">
          <h2 className="text-h3 font-semibold text-brand-dark">
            Completed Sprints
          </h2>
          <p className="mt-xs text-body-md text-brand-dark/70">
            A list of completed sprints with dates and summary information.
          </p>

          {pastSprints.length === 0 ? (
            <p className="mt-lg text-body-md text-brand-dark/70">
              No completed sprints yet. Once an iteration ends, it will appear
              here on the next sync.
            </p>
          ) : (
            <div className="mt-lg space-y-md">
              {pastSprints.map((sprint) => (
                <button
                  key={sprint.id}
                  type="button"
                  className="w-full rounded-xl border border-brand-dark/10 bg-brand-surface px-lg py-lg text-left transition hover:border-brand-accent hover:bg-brand-background"
                >
                  <div className="flex flex-col gap-md lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-body-lg font-semibold text-brand-dark">
                        {sprint.name}
                      </h3>

                      <p className="mt-xs text-body-sm text-brand-dark/60">
                        {formatDate(sprint.startDate)} -{" "}
                        {formatDate(sprint.endDate)}
                      </p>

                      {sprint.summary ? (
                        <p className="mt-sm text-body-md text-brand-dark/70">
                          {sprint.summary}
                        </p>
                      ) : null}

                      <p className="mt-sm text-body-sm font-medium text-brand-accent">
                        Click to view more details
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:min-w-[320px]">
                      <SprintSummaryStat
                        label="Commits"
                        value={sprint.commits}
                      />
                      <SprintSummaryStat
                        label="PRs Merged"
                        value={sprint.pullRequestsMerged}
                      />
                      <SprintSummaryStat
                        label="Issues Closed"
                        value={sprint.issuesClosed}
                      />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </BorderedPanel>
      </Card>
    </PageContainer>
  );
}
