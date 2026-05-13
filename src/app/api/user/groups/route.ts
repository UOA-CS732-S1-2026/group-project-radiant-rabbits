import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import { Group } from "@/app/lib/models";
import connectMongoDB from "@/app/lib/mongodbConnection";
import { normalizeUserRefString } from "@/app/lib/userRef";

export async function GET(_request: NextRequest) {
  try {
    if (process.env.TEST_MODE === "true") {
      return NextResponse.json({
        currentGroups: [
          {
            id: "group-current-active",
            name: "sprint-hub-repo",
            repoOwner: "radiant-rabbits",
            active: true,
          },
          {
            id: "group-current-archived",
            name: "legacy-repo",
            repoOwner: "radiant-rabbits",
            active: false,
          },
        ],
        joinGroups: [
          {
            id: "group-joinable",
            name: "joinable-repo",
            repoOwner: "radiant-rabbits",
            inviteCode: "ABCD1234",
          },
        ],
        createGroups: [
          {
            id: "repo-creatable",
            name: "new-team-repo",
            repoOwner: "radiant-rabbits",
          },
        ],
      });
    }

    const session = await getServerSession(options);
    const sessionWithToken = session as {
      accessToken?: string;
      user?: { id?: string; name?: string };
    };

    // Check if user has logged in and has a token
    if (!sessionWithToken?.user?.id || !sessionWithToken.accessToken) {
      return NextResponse.json(
        { error: "Authentication and GitHub token required" },
        { status: 401 },
      );
    }

    const userId = normalizeUserRefString(sessionWithToken.user.id);

    // GitHub is the source of truth for repo visibility; Mongo only tells us
    // which repos already have SprintHub groups.
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
      id: number;
      name: string;
      owner: { login: string };
    }>;

    // Fetch all groups from mongodb
    await connectMongoDB();
    const allGroups = await Group.find({}).lean();

    // Initialising groups
    const currentGroups: typeof allGroups = [];
    const joinGroups: typeof allGroups = [];
    const createGroups: Array<{
      id: string;
      repoName: string;
      repoOwner: string;
    }> = [];

    // Split existing groups by both SprintHub membership and GitHub visibility
    // so private groups are only advertised to users who can access the repo.
    allGroups.forEach((group) => {
      // If the user is already a member, add to "Your Groups"
      if (
        userId &&
        group.members
          .map((member: unknown) => normalizeUserRefString(member))
          .includes(userId)
      ) {
        currentGroups.push(group);
      }
      // If they aren't a member, check if they have GitHub access to the associated repo
      else {
        const hasGithubAccess = githubRepos.some(
          (repo) =>
            repo.name === group.repoName &&
            repo.owner.login === group.repoOwner,
        );

        // If they have access, add to "Joinable Groups"
        if (hasGithubAccess) {
          joinGroups.push(group);
        }
      }
    });

    // Repos without a group become creation candidates, which prevents users
    // from creating duplicate groups for the same GitHub source.
    githubRepos.forEach((repo) => {
      // Check if a group already exists in MongoDB for this specific repo
      const groupExists = allGroups.some(
        (group) =>
          group.repoName === repo.name && group.repoOwner === repo.owner.login,
      );

      // If no group exists, the user can create one!
      if (!groupExists) {
        createGroups.push({
          id: repo.id.toString(),
          repoName: repo.name,
          repoOwner: repo.owner.login,
        });
      }
    });

    return NextResponse.json({
      currentGroups: currentGroups.map((group) => ({
        id: group._id.toString(),
        name: group.repoName,
        repoOwner: group.repoOwner,
        active: group.active !== false,
      })),

      joinGroups: joinGroups.map((group) => ({
        id: group._id.toString(),
        name: group.repoName,
        repoOwner: group.repoOwner,
        inviteCode: group.inviteCode,
      })),

      createGroups: createGroups.map((repo) => ({
        id: repo.id,
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
