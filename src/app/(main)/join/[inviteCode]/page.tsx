import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { checkRepoAccess } from "@/app/lib/githubService";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup, normalizeUserRef } from "@/app/lib/userRef";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import PageContainer from "@/components/shared/PageContainer";
import SectionHeading from "@/components/shared/SectionHeading";

// Keep invite handling server-side so the GitHub access token and repository
// authorization check are never exposed to the client.
export async function joinInviteLogic(
  inviteCode: string,
  userId: string,
  accessToken: string,
) {
  try {
    // Connect to database
    await connectMongoDB();

    // Invite links are shareable, so the code alone must only identify a group;
    // repository access is still checked below before membership changes.
    const group = await Group.findOne({ inviteCode: inviteCode.trim() });

    // If no group is found, return invalid invite error
    if (!group) {
      return { error: "Invalid Invite" };
    }

    // Check if the user is already a member of the linked group
    const isAlreadyMember = isUserInGroup(group.members, userId);

    // If user is already a member, return existing member error
    if (isAlreadyMember) {
      return { error: "Already Member", group };
    }

    // Private repository access remains the real authorization boundary even
    // when someone has a valid invite URL.
    const repoAccess = await checkRepoAccess(
      accessToken,
      group.repoOwner,
      group.repoName,
    );

    // If the user doesn't have repository access, return access error
    if (!repoAccess) {
      return { error: "No Repository Access" };
    }

    // $addToSet makes invite links safe to refresh/retry without duplicating
    // membership entries.
    await Group.updateOne(
      { _id: group._id },
      { $addToSet: { members: normalizeUserRef(userId) } },
    );

    return { success: true, group };
  } catch (e) {
    // Return an error if failure to connect to database
    return { error: "Database Connection Error", e };
  }
}

export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const session = await getServerSession(options);
  const sessionWithToken = session as { accessToken?: string };

  if (!session?.user?.id) {
    // Preserve the invite URL through sign-in so the user returns to the same
    // group-join attempt after GitHub auth.
    redirect(`/?callbackUrl=/join/${inviteCode}`);
  }

  // Retrieving state from invite logic conditions
  const result = await joinInviteLogic(
    inviteCode,
    session.user.id,
    sessionWithToken.accessToken as string,
  );

  // Render explicit failure states instead of redirecting immediately so users
  // can tell whether the problem is the invite, repo access, or infrastructure.
  if (result.error === "Database Connection Error") {
    return (
      <PageContainer>
        <SectionHeading title="Database Connection Error" />
        <Card>
          <p className="mb-6 text-gray-700">
            We have encountered an error connecting to the database.
          </p>
          <Button href="/group">Back to Groups</Button>
        </Card>
      </PageContainer>
    );
  }

  if (result.error === "Invalid Invite") {
    return (
      <PageContainer>
        <SectionHeading title="Invalid Invite Link" />
        <Card>
          <p className="mb-6 text-gray-700">
            The code {inviteCode} is invalid.
          </p>
          <Button href="/group">Back to Groups</Button>
        </Card>
      </PageContainer>
    );
  }

  if (result.error === "Already Member") {
    return (
      <PageContainer>
        <SectionHeading title="Already a Member" />
        <Card>
          <p className="mb-6 text-gray-700">
            {`You are already a member of the ${result.group.name} group.`}
          </p>
          <Button href={`/dashboard/${result.group?._id}`}>
            Go to Group Dashboard
          </Button>
        </Card>
      </PageContainer>
    );
  }

  if (result.error === "No Repository Access") {
    return (
      <PageContainer>
        <SectionHeading title="Access Denied" />
        <Card>
          <p className="mb-6 text-gray-700">
            You do not have access to the associated GitHub repository for this
            group.
          </p>
          <Link href="/group">
            <Button type="button">Back to Groups</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionHeading title={`Joined ${result.group?.name}!`} />
      <Card>
        <p className="mb-6 text-gray-700">
          {" "}
          You have successfully joined {result.group?.name}!
        </p>
        <Button href={`/dashboard/${result.group?._id}`}>
          Go to Group Dashboard
        </Button>
      </Card>
    </PageContainer>
  );
}
