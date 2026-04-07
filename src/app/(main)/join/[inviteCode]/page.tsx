import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

// Function to retrieve conditional logic for join page via invite code
export async function joinInviteLogic(inviteCode: string, userName: string) {
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
    const isAlreadyMember = group.members.includes(userName);

    // If user is already a member, return existing member error
    if (isAlreadyMember) {
      return { error: "Already Member", group };
    }

    // Else, the user should be able to join the group
    // If they aren't a member yet, update group membership before redirecting
    await Group.updateOne(
      { _id: group._id },
      { $addToSet: { members: userName } },
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

  // Check if user has logged in with a valid Github account
  if (!session?.user?.name) {
    // Redirect to login if no session exists
    redirect(`/?callbackUrl=/join/${inviteCode}`);
  }

  // Retrieving state from invite logic conditions
  const result = await joinInviteLogic(inviteCode, session.user.name);

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
