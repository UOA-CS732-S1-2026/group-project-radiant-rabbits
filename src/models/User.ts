import * as mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
  },
  {
    timestamps: true,
  },
);

// Explicit unique index for acceptance criteria
userSchema.index({ githubId: 1 }, { unique: true });

export type UserDocument = mongoose.InferSchemaType<typeof userSchema>;

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
