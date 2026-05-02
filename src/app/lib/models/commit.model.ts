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
      // GitHub login of the commit author, used to render avatars.
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

// Commits are unique per group/repo in this app.
// The sync path already matches on { sha, group }, so the index must use the same compound key
commitSchema.index({ sha: 1, group: 1 }, { unique: true });
commitSchema.index({ group: 1, date: 1 });
commitSchema.index({ group: 1, "author.name": 1 });

export const Commit =
  mongoose.models.Commit || mongoose.model("Commit", commitSchema);
