import { getServerSession } from "next-auth";
import PageTopBar from "@/app/(main)/components/PageTopBar";
import SideNav from "@/app/(main)/components/SideNav";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group, User } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";

type LeanUserWithCurrentGroup = {
  currentGroupId?: { repoName?: string } | null;
} | null;

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(options);

  let repoName = "Repo Name"; // Default value if repo name cannot be fetched

  try {
    await connectMongoDB();

    // Fetching user's current group repo name
    const userWithGroup = (await User.findOne({ githubId: session?.user?.id })
      .populate({
        path: "currentGroupId",
        model: Group,
        select: "repoName",
      })
      .lean()) as LeanUserWithCurrentGroup;

    if (userWithGroup?.currentGroupId?.repoName) {
      repoName = userWithGroup.currentGroupId.repoName;
    }
  } catch (error) {
    // Database connection error
    console.error("Failed to fetch group data for layout:", error);
  }

  return (
    <div className="flex h-screen min-h-0 overflow-hidden">
      <SideNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          repoName={repoName}
          pageLabel="Current Sprint"
          // Use session-backed avatar
          profileImageUrl={session?.user?.image ?? undefined}
          profileName={session?.user?.name ?? undefined}
        />

        <main className="min-h-0 flex-1 overflow-y-auto lg:overflow-y-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
