import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    githubId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    login: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: function () {
        return this.githubId;
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    avatarUrl: {
      type: String,
      default: null,
      trim: true,
      alias: "image",
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ name: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
