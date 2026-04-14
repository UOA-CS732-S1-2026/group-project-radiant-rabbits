import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models/group.model";
import { User } from "@/app/lib/models/user.model";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRefString } from "@/app/lib/userRef";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<void> },
) {
  try {
    const session = await getServerSession(options);
    const sessionWithToken = session as {
      accessToken?: string;
      user?: { id?: string; name?: string };
    };

    if (!sessionWithToken?.user?.id || !sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "Authentication and GitHub token required" },
        { status: 401 },
      );
    }

    const userId = normalizeUserRefString(sessionWithToken.user.id);

    const githubResponse = await fetch(
      "https://api.github.com/user/repos?per_page=100",
      {
        headers: {
          Authorization: `Bearer ${sessionWithToken.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!githubResponse.ok) {
      throw new Error("Failed to fetch repositories from GitHub");
    }

    const githubRepos = (await githubResponse.json()) as Array<{
      name: string;
      owner: { login: string };
    }>;

    await connectMongoDB();

    const [allGroups, user] = await Promise.all([
      Group.find({}).lean(),
      User.findOne({ githubId: userId }).lean(),
    ]);

    const currentActiveGroupId = user?.currentGroupId?.toString() ?? null;

    const currentGroups: typeof allGroups = [];
    const joinGroups: typeof allGroups = [];
    const createGroups: Array<{ repoName: string; repoOwner: string }> = [];

    allGroups.forEach((group) => {
      // If the user is already a member, add to "Current Groups"
      if (group.members.map(String).includes(userId)) {
        currentGroups.push(group);
      } else {
        const hasGithubAccess = githubRepos.some(
          (repo) =>
            repo.name === group.repoName &&
            repo.owner.login === group.repoOwner,
        );

        if (hasGithubAccess) {
          joinGroups.push(group);
        }
      }
    });

    // Sort the remaining GitHub repos into "Creatable Groups" if no existing group is associated with that repo in MongoDB
    githubRepos.forEach((repo: any) => {
      // Check if a group already exists in MongoDB for this specific repo
      const groupExists = allGroups.some(
        (group) =>
          group.repoName === repo.name && group.repoOwner === repo.owner.login,
      );

      if (!groupExists) {
        createGroups.push({
          repoName: repo.name,
          repoOwner: repo.owner.login,
        });
      }
    });

    return NextResponse.json({
      currentGroups: currentGroups.map((group) => ({
        _id: group._id.toString(),
        name: group.repoName,
        repoOwner: group.repoOwner,
        isCurrent: currentActiveGroupId === group._id.toString(),
      })),

      joinGroups: joinGroups.map((group) => ({
        _id: group._id.toString(),
        name: group.repoName,
        repoOwner: group.repoOwner,
        inviteCode: group.inviteCode,
      })),

      createGroups: createGroups.map((repo) => ({
        name: repo.repoName,
        repoOwner: repo.repoOwner,
      })),
    });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching groups" },
      { status: 500 },
    );
  }
}
