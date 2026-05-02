import mongoose, { Schema } from "mongoose";
import { normalizeUserRef } from "@/app/lib/userRef";

const issueSchema = new Schema(
  {
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
      enum: ["OPEN", "CLOSED"],
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
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
    },
    assignees: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        set: normalizeUserRef,
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Use a compound unique index so the same issue number can exist in different groups/repos without duplication
issueSchema.index({ number: 1, group: 1 }, { unique: true });
issueSchema.index({ group: 1, sprint: 1 });
issueSchema.index({ group: 1, state: 1, closedAt: 1 });
issueSchema.index({ group: 1, createdAt: 1 });

export const Issue =
  mongoose.models.Issue || mongoose.model("Issue", issueSchema);
