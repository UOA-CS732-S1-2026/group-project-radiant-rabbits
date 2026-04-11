import mongoose, { model, models, Schema } from "mongoose";

const groupSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
  },
  members: [
    {
      type: String,
      required: true,
    },
  ],
  repoName: {
    type: String,
    unique: true,
    sparse: true,
  },
  repoNURL: {
    type: String,
    unique: true,
    sparse: true,
  },
  createdBy: {
    type: String,
    required: true,
  },
  sprintSettings: {
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    sprintLength: {
      type: Number,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Group = models.Group || model("Group", groupSchema);

export default Group;
