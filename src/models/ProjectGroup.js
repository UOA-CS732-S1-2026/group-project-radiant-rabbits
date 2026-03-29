import mongoose, { Schema } from "mongoose";

const projectGroupSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Explicit unique index for acceptance criteria
projectGroupSchema.index({ inviteCode: 1 }, { unique: true });

const ProjectGroup =
  mongoose.models.ProjectGroup ||
  mongoose.model("ProjectGroup", projectGroupSchema);

export default ProjectGroup;
