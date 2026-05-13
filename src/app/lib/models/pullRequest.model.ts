import mongoose, { Schema } from "mongoose";

const pullRequestSchema = new Schema({
  number: {
    type: Number,
    required: true,
    min: 1,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    enum: ["OPEN", "CLOSED", "MERGED"],
    required: true,
  },
  createdAt: {
    type: Date,
    required: true,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  mergedAt: {
    type: Date,
    default: null,
  },
  author: {
    type: String,
    default: "unknown",
    trim: true,
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: "Group",
    required: true,
  },
});

// PR numbers are only unique within a repository; group scope prevents two
// tracked repos from colliding on the same GitHub number.
pullRequestSchema.index({ number: 1, group: 1 }, { unique: true });
pullRequestSchema.index({ group: 1, createdAt: 1 });
pullRequestSchema.index({ group: 1, state: 1, mergedAt: 1 });

export const PullRequest =
  mongoose.models.PullRequest ||
  mongoose.model("PullRequest", pullRequestSchema);
