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

  // Keep the shell renderable even when the current group lookup fails; page
  // content handles the real empty/error states.
  let repoName = "Repo Name";

  try {
    await connectMongoDB();

    // The layout only needs the repo label, so avoid loading full group data on
    // every page render.
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
    // Navigation should still render if the label lookup fails; blocking here
    // would hide page-level recovery actions.
    console.error("Failed to fetch group data for layout:", error);
  }

  return (
    <div className="flex h-screen min-h-0 overflow-hidden">
      <SideNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <PageTopBar
          repoName={repoName}
          // The session avatar is already available from auth and avoids an
          // extra user-profile query in the shared shell.
          profileImageUrl={session?.user?.image ?? undefined}
          profileName={session?.user?.name ?? undefined}
        />

        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
