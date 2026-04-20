import dns from "node:dns";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URL;
let dnsFallbackApplied = false;

function isSrvDnsFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybeError = error as {
    code?: string;
    syscall?: string;
    message?: string;
  };

  if (maybeError.code === "ECONNREFUSED" && maybeError.syscall === "querySrv") {
    return true;
  }

  return (
    typeof maybeError.message === "string" &&
    maybeError.message.includes("querySrv ECONNREFUSED")
  );
}

function applyDnsFallback(): void {
  if (dnsFallbackApplied) {
    return;
  }

  dns.setServers(["8.8.8.8", "1.1.1.1"]);
  dnsFallbackApplied = true;
}

const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URL in .env.local");
  }

  if (
    mongoose.connection.readyState === 1 ||
    mongoose.connection.readyState === 2
  ) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: "nextjs-backend",
    });
  } catch (error) {
    if (!isSrvDnsFailure(error) || dnsFallbackApplied) {
      throw error;
    }

    applyDnsFallback();
    await mongoose.connect(MONGODB_URI, {
      dbName: "nextjs-backend",
    });
  }
};

export default connectMongoDB;
