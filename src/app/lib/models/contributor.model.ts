import mongoose, { Schema } from "mongoose";

const contributorSchema = new Schema(
  {
    githubId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      trim: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

contributorSchema.index({ githubId: 1, group: 1 }, { unique: true });
// Dashboards usually need the most recently active contributors for one group,
// so this index matches that access pattern.
contributorSchema.index({ group: 1, lastSeen: -1 });

export const Contributor =
  mongoose.models.Contributor ||
  mongoose.model("Contributor", contributorSchema);
