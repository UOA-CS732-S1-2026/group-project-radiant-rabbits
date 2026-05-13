import mongoose, { Schema } from "mongoose";

const sprintSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    goal: {
      type: String,
      default: null,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "COMPLETED"],
      default: "PLANNING",
      required: true,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    aiReview: {
      text: {
        type: String,
        default: null,
        trim: true,
      },
      generatedAt: {
        type: Date,
        default: null,
      },
      model: {
        type: String,
        default: null,
        trim: true,
      },
      provider: {
        type: String,
        default: null,
        trim: true,
      },
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    iterationId: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

sprintSchema.index({ group: 1, startDate: 1 });
sprintSchema.index({ group: 1, endDate: 1 });
sprintSchema.index({ group: 1, isCurrent: 1 });
sprintSchema.index(
  { group: 1, iterationId: 1 },
  {
    unique: true,
    // Manually-created or fallback sprints can have no GitHub iteration; only
    // synced iteration-backed sprints need uniqueness within a group.
    partialFilterExpression: { iterationId: { $type: "string" } },
  },
);

export const Sprint =
  mongoose.models.Sprint || mongoose.model("Sprint", sprintSchema);
