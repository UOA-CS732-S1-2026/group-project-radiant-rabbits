import {
  fetchIterations,
  fetchProjectTasks,
} from "../src/app/lib/githubService";

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.OWNER;
  const repo = process.env.REPO;

  if (!token || !owner || !repo) {
    console.error("Set GITHUB_TOKEN, OWNER, and REPO env vars.");
    process.exit(1);
  }

  console.log(`\nFetching iterations from ${owner}/${repo}...\n`);
  const { iterations, iterationFieldConfigured } = await fetchIterations(
    token,
    owner,
    repo,
  );

  console.log(
    `Iteration field configured: ${iterationFieldConfigured ? "yes" : "no"}`,
  );

  if (iterations.length === 0) {
    console.log("No iterations found. Check that:");
    console.log("  - the repo has a Project v2 attached");
    console.log(
      "  - the project has an iteration field (default name: 'Sprint')",
    );
    console.log("  - your token has read:project scope");
    return;
  }

  console.log(`Found ${iterations.length} iterations:\n`);
  for (const it of iterations) {
    const start = new Date(it.startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + it.duration - 1);
    console.log(
      `  ${it.title.padEnd(20)} ${it.startDate}  ->  ${end.toISOString().slice(0, 10)}  (${it.duration}d)  id=${it.id}`,
    );
  }

  console.log(`\nFetching project tasks...\n`);
  const tasks = await fetchProjectTasks(token, owner, repo);
  const grouped = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const key = task.iterationId ?? "(no iteration)";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(task);
  }

  for (const [iterId, ts] of grouped) {
    const iter = iterations.find((i) => i.id === iterId);
    const label = iter ? iter.title : iterId;
    console.log(`  ${label}: ${ts.length} tasks`);
    for (const t of ts.slice(0, 3)) {
      console.log(`    - [${t.status}] ${t.title}`);
    }
    if (ts.length > 3) console.log(`    ... and ${ts.length - 3} more`);
  }
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
