import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URL;

const connectMongoDB = async () => {
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URL in .env.local");
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(MONGODB_URI, {
    dbName: "nextjs-backend",
  });
};

export default connectMongoDB;
