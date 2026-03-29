import * as mongoose from "mongoose";

const projectGroupSchema = new mongoose.Schema(
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
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
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

export type ProjectGroupDocument = mongoose.InferSchemaType<
  typeof projectGroupSchema
> & {
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
};

const ProjectGroup =
  mongoose.models.ProjectGroup ||
  mongoose.model("ProjectGroup", projectGroupSchema);

export default ProjectGroup;
