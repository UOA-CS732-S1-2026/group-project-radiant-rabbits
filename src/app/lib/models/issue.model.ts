import mongoose, { Schema } from "mongoose";
import { normalizeUserRef } from "@/app/lib/userRef";

const issueSchema = new Schema({
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
      // Assignees can arrive from GitHub/login-shaped inputs in sync code and
      // from ObjectId refs in app code, so normalize before Mongo stores them.
      set: normalizeUserRef,
    },
  ],
});

// Issue numbers are repository-local on GitHub; group scope lets different
// tracked repositories each have their own Issue #1.
issueSchema.index({ number: 1, group: 1 }, { unique: true });
issueSchema.index({ group: 1, sprint: 1 });
issueSchema.index({ group: 1, state: 1, closedAt: 1 });
issueSchema.index({ group: 1, createdAt: 1 });

export const Issue =
  mongoose.models.Issue || mongoose.model("Issue", issueSchema);
