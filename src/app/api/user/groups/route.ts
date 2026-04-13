import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { options } from "@/app/api/auth/[...nextauth]/options";
import Group from "@/app/database/models/Group";
import User from "@/app/database/models/User";
import connectMongoDB from "@/app/lib/mongodbConnection";

export async function GET(request: NextRequest) {
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

    const userId = sessionWithToken.user.id;

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

    const githubRepos = await githubResponse.json();

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
      if (group.members.map(String).includes(userId)) {
        currentGroups.push(group);
      } else {
        const hasGithubAccess = githubRepos.some(
          (repo: any) =>
            repo.name === group.repoName &&
            repo.owner.login === group.repoOwner,
        );

        if (hasGithubAccess) {
          joinGroups.push(group);
        }
      }
    });

    githubRepos.forEach((repo: any) => {
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
