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

commitSchema.index({ sha: 1 }, { unique: true });
commitSchema.index({ group: 1, date: 1 });
commitSchema.index({ group: 1, "author.name": 1 });

export const Commit =
  mongoose.models.Commit || mongoose.model("Commit", commitSchema);
