import mongoose, { Schema } from "mongoose";

const sprintTaskSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "DONE"],
      required: true,
    },
    assignees: [
      {
        type: String,
        trim: true,
      },
    ],
    issueNumber: {
      type: Number,
      default: null,
      min: 1,
    },
    sprint: {
      type: Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
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
  // GitHub DraftIssues do not have issue numbers, so sparse uniqueness lets
  // multiple draft-backed tasks exist while still protecting real issue rows.
  { unique: true, sparse: true },
);
sprintTaskSchema.index({ group: 1, title: 1, issueNumber: 1 });

export const SprintTask =
  mongoose.models.SprintTask || mongoose.model("SprintTask", sprintTaskSchema);
