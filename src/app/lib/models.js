import mongoose, { Schema } from "mongoose";

const taskSchema = new Schema(
  {
    title: String,
    description: String,
  },
  {
    timestamps: true,
  },
);

const Task = mongoose.models.Task || mongoose.model("Task", taskSchema);

const groupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Group =
  mongoose.models.Group || mongoose.model("Group", groupSchema);

export default Task;
