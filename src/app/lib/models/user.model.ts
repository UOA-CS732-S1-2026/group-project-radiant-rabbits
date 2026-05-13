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
        // Existing test fixtures and older users may only have githubId; using it
        // as the login preserves uniqueness without forcing a migration first.
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
    currentGroupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ name: 1 });

export const User = mongoose.models.User || mongoose.model("User", userSchema);
