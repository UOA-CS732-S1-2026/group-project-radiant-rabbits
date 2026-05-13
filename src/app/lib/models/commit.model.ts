import mongoose, { Schema } from "mongoose";

const commitSchema = new Schema(
  {
    sha: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      default: "",
    },
    author: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      // Git author name/email can differ from a GitHub account; login gives
      // dashboards a stronger identity key and lets the UI resolve avatars.
      login: { type: String, default: null, trim: true },
    },
    date: {
      type: Date,
      required: true,
    },
    filesChanged: {
      type: Number,
      min: 0,
      default: 0,
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

// The same commit SHA can appear in more than one tracked repository, so group
// scope avoids false duplicate-key failures across teams.
commitSchema.index({ sha: 1, group: 1 }, { unique: true });
commitSchema.index({ group: 1, date: 1 });
commitSchema.index({ group: 1, "author.login": 1 });

export const Commit =
  mongoose.models.Commit || mongoose.model("Commit", commitSchema);
