import mongoose, { Schema } from "mongoose";

// Group schema

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    members: [
      {
        type: String,
        default: [],
      },
    ],
    repoOwner: {
      type: String,
    },
    repoName: {
      type: String,
    },
    createdBy: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ["pending", "in_progress", "success", "failed", "rate_limited"],
      default: "pending",
    },
    syncError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

export const Group =
  mongoose.models.Group || mongoose.model("Group", groupSchema);

// Commit schema

const commitSchema = new Schema(
  {
    sha: {
      type: String,
      required: true,
    },
    message: {
      type: String,
    },
    author: {
      name: { type: String },
      email: { type: String },
    },
    date: {
      type: Date,
    },
    filesChanged: {
      type: Number,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

commitSchema.index({ sha: 1, group: 1 }, { unique: true });

export const Commit =
  mongoose.models.Commit || mongoose.model("Commit", commitSchema);

// PullRequest schema

const pullRequestSchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
    },
    state: {
      type: String,
      enum: ["OPEN", "CLOSED", "MERGED"],
    },
    createdAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    mergedAt: {
      type: Date,
    },
    author: {
      type: String,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

pullRequestSchema.index({ number: 1, group: 1 }, { unique: true });

export const PullRequest =
  mongoose.models.PullRequest ||
  mongoose.model("PullRequest", pullRequestSchema);

// Issue schema

const issueSchema = new Schema(
  {
    number: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
    },
    state: {
      type: String,
      enum: ["OPEN", "CLOSED"],
    },
    createdAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    author: {
      type: String,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

issueSchema.index({ number: 1, group: 1 }, { unique: true });

export const Issue =
  mongoose.models.Issue || mongoose.model("Issue", issueSchema);

// Contributor schema

const contributorSchema = new Schema(
  {
    githubId: {
      type: String,
      required: true,
    },
    name: {
      type: String,
    },
    email: {
      type: String,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    lastSeen: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

contributorSchema.index({ githubId: 1, group: 1 }, { unique: true });

export const Contributor =
  mongoose.models.Contributor ||
  mongoose.model("Contributor", contributorSchema);

// SprintTask schema

const sprintTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      required: true,
    },
    assignees: [
      {
        type: String,
      },
    ],
    issueNumber: {
      type: Number,
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

sprintTaskSchema.index({ sprint: 1, group: 1 });
sprintTaskSchema.index(
  { issueNumber: 1, group: 1 },
  { unique: true, sparse: true },
);

export const SprintTask =
  mongoose.models.SprintTask || mongoose.model("SprintTask", sprintTaskSchema);
