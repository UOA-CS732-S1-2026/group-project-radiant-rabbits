import mongoose, { Schema } from "mongoose";
import { normalizeUserRef } from "@/app/lib/userRef";

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        set: normalizeUserRef,
      },
    ],
    repoOwner: {
      type: String,
      default: null,
      trim: true,
    },
    repoName: {
      type: String,
      default: null,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      set: normalizeUserRef,
    },
    projectStartDate: {
      type: Date,
      default: null,
    },
    projectEndDate: {
      type: Date,
      default: null,
    },
    sprintLengthDays: {
      type: Number,
      min: 1,
      default: null,
    },
    lastSyncAt: {
      type: Date,
      default: null,
    },
    syncStatus: {
      type: String,
      enum: ["pending", "in_progress", "success", "failed", "rate_limited"],
      default: "pending",
      required: true,
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

groupSchema.index(
  { repoOwner: 1, repoName: 1 },
  {
    unique: true,
    partialFilterExpression: {
      repoOwner: { $type: "string" },
      repoName: { $type: "string" },
    },
  },
);
groupSchema.index({ members: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ projectStartDate: 1, projectEndDate: 1 });
groupSchema.index({ syncStatus: 1 });

export const Group =
  mongoose.models.Group || mongoose.model("Group", groupSchema);
