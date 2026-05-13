import mongoose, { Schema } from "mongoose";

const contributionSummarySchema = new Schema(
  {
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
      required: true,
    },
    kind: {
      type: String,
      enum: ["team", "contributor"],
      required: true,
    },
    // For kind="contributor", the contributor's display name (matches the
    // value the frontend sends in the POST body). Null for kind="team".
    contributorKey: {
      type: String,
      default: null,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
    },
    // SHA-256 of the aggregated workload profile JSON. Used to detect when
    // underlying data has changed and the cached summary is stale.
    inputHash: {
      type: String,
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["openai", "gemini"],
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

contributionSummarySchema.index(
  { group: 1, sprint: 1, kind: 1, contributorKey: 1 },
  // One cache row per summary target keeps regeneration idempotent when users
  // click the generate action repeatedly.
  { unique: true },
);
contributionSummarySchema.index({ sprint: 1 });

export const ContributionSummary =
  mongoose.models.ContributionSummary ||
  mongoose.model("ContributionSummary", contributionSummarySchema);
