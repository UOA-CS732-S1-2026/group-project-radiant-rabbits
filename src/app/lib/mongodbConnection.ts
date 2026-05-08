import dns from "node:dns";
import mongoose from "mongoose";
import {
  Commit,
  Contributor,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
  User,
} from "./models";

const MONGODB_URI = process.env.MONGODB_URL;

// Models that need their indexes reconciled. syncIndexes() drops any index
// in MongoDB that no longer exists in the schema (e.g. legacy single-field
// unique on `number` left over before we moved to compound `{number, group}`)
// and creates any new ones declared in the schema.
const INDEXED_MODELS = [
  Commit,
  Contributor,
  Group,
  Issue,
  PullRequest,
  Sprint,
  SprintTask,
  User,
];

let indexesSynced = false;

async function reconcileIndexes() {
  if (indexesSynced) return;
  indexesSynced = true;
  try {
    await Promise.all(INDEXED_MODELS.map((model) => model.syncIndexes()));
  } catch (error) {
    indexesSynced = false;
    console.error("Failed to reconcile MongoDB indexes:", error);
  }
}
let dnsFallbackApplied = false;

function isSrvDnsFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string;
    syscall?: string;
    message?: string;
  };

  if (maybeError.code === "ECONNREFUSED" && maybeError.syscall === "querySrv") {
    return true;
  }

  return (
    typeof maybeError.message === "string" &&
    maybeError.message.includes("querySrv ECONNREFUSED")
  );
}

function applyDnsFallback(): void {
  if (dnsFallbackApplied) {
    return;
  }

  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  dnsFallbackApplied = true;
}

const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URL in .env.local");
  }

  if (
    mongoose.connection.readyState === 1 ||
    mongoose.connection.readyState === 2
  ) {
    await reconcileIndexes();
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "nextjs-backend",
    });
  } catch (error) {
    if (!isSrvDnsFailure(error) || dnsFallbackApplied) {
      throw error;
    }

    applyDnsFallback();
    await mongoose.connect(MONGODB_URI, {
      dbName: "nextjs-backend",
    });
  }

  await reconcileIndexes();
};

export default connectMongoDB;
