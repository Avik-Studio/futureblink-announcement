import mongoose from "mongoose";

let connected = false;

/**
 * Connect Mongoose to MongoDB. Used for the announcement audit history.
 * (Shopify sessions use their own MongoDB connection via the session storage adapter.)
 */
export async function connectMongo() {
  if (connected) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to web/.env (see web/.env.example).");
  }

  const dbName = process.env.MONGODB_DB || "futureblink_shopify";
  await mongoose.connect(uri, { dbName });
  connected = true;
  console.log(`> Connected to MongoDB (database: ${dbName})`);
}
