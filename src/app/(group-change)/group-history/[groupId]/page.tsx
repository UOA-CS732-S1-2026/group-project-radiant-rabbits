import type mongoose from "mongoose";
import { Types } from "mongoose";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, Sprint, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup, normalizeUserRefString } from "@/app/lib/userRef";
import BorderedPanel from "@/components/shared/BorderedPanel";
import Button from "@/components/shared/Button";
import PageContainer from "@/components/shared/PageContainer";

type PastSprintRow = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
};

type Teammate = {
  id: string;
  name: string;
  login: string | null;
  email: string | null;
  avatarUrl: string | null;
};

function formatDate(value: Date) {
  return value.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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
      }>
    >();

  return Promise.all(
    sprints.map(async (sprint) => {
      return {
        id: String(sprint._id),
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      };
    }),
  );
}

function getInitials(name: string) {
  const tokens = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (tokens.length === 0) return "?";
  return tokens.map((token) => token[0]?.toUpperCase() ?? "").join("");
}

export default async function GroupHistoryPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await getServerSession(options);
  if (!session?.user?.id) {
    redirect("/");
  }

  const { groupId } = await params;
  if (!Types.ObjectId.isValid(groupId)) {
    redirect("/join-create-switch-group");
  }

  await connectMongoDB();

  const group = await Group.findById(groupId).lean<{
    _id: mongoose.Types.ObjectId;
    name: string;
    members: unknown[];
    active?: boolean;
  } | null>();

  if (
    !group ||
    !isUserInGroup(group.members, session.user.id) ||
    group.active
  ) {
    redirect("/join-create-switch-group");
  }

  const memberIds = (group.members ?? [])
    .map((member) => normalizeUserRefString(member))
    .filter((memberId): memberId is string => Boolean(memberId));

  const profiles = await User.find(
    { _id: { $in: memberIds } },
    { name: 1, login: 1, email: 1, avatarUrl: 1 },
  ).lean<
    Array<{
      _id: unknown;
      name?: string;
      login?: string;
      email?: string;
      avatarUrl?: string | null;
    }>
  >();

  const profilesById = new Map(
    profiles
      .map((profile) => {
        const id = normalizeUserRefString(profile._id);
        return id ? [id, profile] : null;
      })
      .filter((entry): entry is [string, (typeof profiles)[number]] =>
        Boolean(entry),
      ),
  );

  const teammates: Teammate[] = memberIds.map((memberId) => {
    const profile = profilesById.get(memberId);
    return {
      id: memberId,
      name:
        profile?.name?.trim() ||
        profile?.login?.trim() ||
        `Member ${memberId.slice(0, 8)}`,
      login: profile?.login ?? null,
      email: profile?.email ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
    };
  });

  const pastSprints = await loadPastSprints(group._id);

  return (
    <PageContainer>
      <div className="mb-md">
        <Button variant="grey" size="sm" href="/join-create-switch-group">
          Back to Groups
        </Button>
      </div>
      <div className="mb-lg flex items-start justify-between gap-md border-b border-brand-dark/10 pb-lg">
        <div>
          <h1 className="text-h2 font-bold text-brand-dark">
            {group.name} (Archived)
          </h1>
          <p className="mt-xs text-body-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">
            Past sprints and teammate list
          </p>
        </div>
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <BorderedPanel className="p-lg">
          <h2 className="text-h3 font-semibold text-brand-dark">
            Past Sprints
          </h2>
          {pastSprints.length === 0 ? (
            <p className="mt-md text-body-md text-brand-dark/70">
              No completed sprints recorded for this project.
            </p>
          ) : (
            <div className="mt-md space-y-sm">
              {pastSprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="rounded-xl border border-brand-dark/10 bg-brand-surface px-md py-md"
                >
                  <h3 className="text-body-lg font-semibold text-brand-dark">
                    {sprint.name}
                  </h3>
                  <p className="mt-xs text-body-sm text-brand-dark/60">
                    {formatDate(sprint.startDate)} -{" "}
                    {formatDate(sprint.endDate)}
                  </p>
                  <div className="mt-sm">
                    <Button size="sm" variant="white">
                      Open Sprint Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BorderedPanel>

        <BorderedPanel className="p-lg">
          <h2 className="text-h3 font-semibold text-brand-dark">Teammates</h2>
          {teammates.length === 0 ? (
            <p className="mt-md text-body-md text-brand-dark/70">
              No teammates found for this archived project.
            </p>
          ) : (
            <div className="mt-md space-y-sm">
              {teammates.map((person) => (
                <div
                  key={person.id}
                  className="rounded-xl border border-brand-dark/10 bg-brand-surface px-md py-sm"
                >
                  <div className="flex items-center gap-sm">
                    {person.avatarUrl ? (
                      <Image
                        src={person.avatarUrl}
                        alt={`${person.name} avatar`}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-accent/20 text-body-sm font-semibold text-brand-dark">
                        {getInitials(person.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-body-md font-semibold text-brand-dark">
                        {person.name}
                      </p>
                      {person.login ? (
                        <p className="text-body-sm text-brand-dark/70">
                          @{person.login}
                        </p>
                      ) : null}
                      {person.email ? (
                        <p className="text-body-sm text-brand-dark/60">
                          {person.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BorderedPanel>
      </div>
    </PageContainer>
  );
}
