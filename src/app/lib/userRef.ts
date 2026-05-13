import { createHash } from "node:crypto";
import mongoose from "mongoose";

function hashToObjectId(value: string): mongoose.Types.ObjectId {
  const hex = createHash("sha1").update(value).digest("hex").slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
}

export function normalizeUserRef(
  value: unknown,
): mongoose.Types.ObjectId | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "string") {
    if (mongoose.isValidObjectId(value)) {
      return new mongoose.Types.ObjectId(value);
    }
    // Older routes stored GitHub ids in relationship fields before every path
    // consistently used Mongo ObjectIds. Hashing keeps those legacy references
    // comparable without needing a risky data migration during request handling.
    return hashToObjectId(value.trim());
  }

  return null;
}

export function normalizeUserRefString(value: unknown): string | null {
  const normalized = normalizeUserRef(value);
  return normalized ? normalized.toString() : null;
}

export function isUserInGroup(
  members: unknown[] | undefined,
  userRef: unknown,
): boolean {
  const target = normalizeUserRefString(userRef);
  if (!target || !members) {
    return false;
  }

  return members.some((member) => normalizeUserRefString(member) === target);
}
