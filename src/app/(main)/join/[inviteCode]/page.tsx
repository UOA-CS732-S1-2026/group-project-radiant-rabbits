import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { checkRepoAccess } from "@/app/lib/githubService";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { isUserInGroup, normalizeUserRef } from "@/app/lib/userRef";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

// Function to retrieve conditional logic for join page via invite code
export async function joinInviteLogic(
  inviteCode: string,
  userId: string,
  accessToken: string,
) {
  try {
    // Connect to database
    await connectMongoDB();

    // Find the group associated with given invite code
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

    // Check if the user has access to the repository linked to the group
    const repoAccess = await checkRepoAccess(
      accessToken,
      group.repoOwner,
      group.repoName,
    );

    // If the user doesn't have repository access, return access error
    if (!repoAccess) {
      return { error: "No Repository Access" };
    }

    // Else, the user should be able to join the group
    // If they aren't a member yet, update group membership before redirecting
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

// Function to render UI for the above defined conditions
export default async function JoinInvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  // Retrieving invite code and GitHub Auth session
  const { inviteCode } = await params;
  const session = await getServerSession(options);
  const sessionWithToken = session as { accessToken?: string };

  // Check if user has logged in with a valid Github account
  if (!session?.user?.id) {
    // Redirect to login if no session exists
    redirect(`/?callbackUrl=/join/${inviteCode}`);
  }

  // Retrieving state from invite logic conditions
  const result = await joinInviteLogic(
    inviteCode,
    session.user.id,
    sessionWithToken.accessToken as string,
  );

  // If the database fails to connect, show error and redirect to groups page
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

  // If the invite code does not correlate to a group in the database, redirect the user to groups page
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

  // Check if the user is already a member of the group
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

  // If the user doesn't have repository access linked to the group, redirect the user to the groups page
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

  // Redirect the user to the group dashboard if successfully joined
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
