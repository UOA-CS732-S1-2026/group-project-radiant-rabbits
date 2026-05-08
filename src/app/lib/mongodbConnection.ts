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

const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URL in .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    await reconcileIndexes();
    return;
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: "nextjs-backend",
  });

  await reconcileIndexes();
};

export default connectMongoDB;
