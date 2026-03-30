import { unique } from "next/dist/build/utils";

const { Schema, model } = require("mongoose");

const userSchema = new Schema({
  githubId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
});

module.exports = model("User", userSchema);

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
  },
  repoNURL: {
    type: String,
    unique: true,
  },
  createdBy: {
    type: String,
    required: true,
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

module.exports = model("Group", groupSchema);
