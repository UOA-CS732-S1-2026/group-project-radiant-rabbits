import mongoose, { Schema } from "mongoose";

const sprintSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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
      trim: true,
    },
    status: {
      type: String,
      enum: ["PLANNING", "ACTIVE", "COMPLETED"],
      default: "PLANNING",
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "ProjectGroup",
      required: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index on group and startDate for query performance
sprintSchema.index({ group: 1, startDate: 1 });

const Sprint = mongoose.models.Sprint || mongoose.model("Sprint", sprintSchema);

export default Sprint;
