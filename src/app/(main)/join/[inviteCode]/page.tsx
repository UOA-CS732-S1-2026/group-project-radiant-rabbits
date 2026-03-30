import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageContainer from "@/components/ui/PageContainer";
import SectionHeading from "@/components/ui/SectionHeading";

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  //const inviteCode = params.inviteCode;
  const { inviteCode } = await params;

  const session = await getServerSession(options);

  // Check if user has logged in with a valid Github account
  if (!session?.user?.name) {
    // Redirect to login if no session exists
    redirect(`/?callbackUrl=/join/${inviteCode}`);
  }

  const userName = session.user.name;
  let group = null;

  try {
    // Database Connection
    await connectMongoDB();
    // Checking if the invite code is valid and points to a group
    group = await Group.findOne({
      inviteCode: inviteCode.trim(),
    });
  } catch (error) {
    console.error("Error joining group:", error);
    // Fallback for DB Connection errors
    return (
      <PageContainer>
        <SectionHeading title="System Error" />
        <Card>
          <p className="mb-6 text-gray-700">
            We encountered a problem connecting to the database. Please try
            again later.
          </p>
          <Link href="/group">
            <Button type="button">Back to Groups</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  // If the invite code does not exist in the database, redirect the user to groups page
  if (!group) {
    return (
      <PageContainer>
        <SectionHeading title="Invalid Invite Link" />
        <Card>
          <p className="mb-6 text-gray-700">
            The code <strong>{inviteCode}</strong> is invalid or has expired.
          </p>
          <Link href="/group">
            <Button type="button">Go back to Groups</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  // 4. REPOSITORY ACCESS CHECK
  const hasRepositoryAccess = true; // DUMMY VAR without repository data access

  if (!hasRepositoryAccess) {
    return (
      <PageContainer>
        <SectionHeading title="No Repository Access" />
        <Card>
          <p className="text-gray-700 mb-6">
            You do not have the required repository access to join this group.
          </p>
          <Link href="/dashboard">
            <Button type="button">Return to Dashboard</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  // Check if the user is already a member of the group
  const isAlreadyMember = group.members.includes(userName);

  if (isAlreadyMember) {
    return (
      <PageContainer>
        <SectionHeading title="Already a Member" />
        <Card>
          <p className="text-gray-500 mb-6">
            You are already a member of this project group.
          </p>
          <Link href={`/dashboard/${group._id}`}>
            <Button type="button">Go to Group Dashboard</Button>
          </Link>
        </Card>
      </PageContainer>
    );
  }

  // If they aren't a member yet, update group membership before redirecting
  await Group.updateOne(
    { _id: group._id },
    { $addToSet: { members: userName } },
  );

  // 7. SUCCESS!
  redirect(`/dashboard/${group._id}`);
}
