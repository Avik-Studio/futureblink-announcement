import "dotenv/config";
import { ApiVersion } from "@shopify/shopify-api";
import { shopifyApp } from "@shopify/shopify-app-express";
import { MongoDBSessionStorage } from "@shopify/shopify-app-session-storage-mongodb";

const DB_NAME = process.env.MONGODB_DB || "futureblink_shopify";

if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI is not set. Add it to web/.env (see web/.env.example).");
}

// Shopify sessions are persisted in MongoDB (same database as the audit history),
// which keeps the whole app on the MERN stack.
const sessionStorage = new MongoDBSessionStorage(
  process.env.MONGODB_URI,
  DB_NAME
);

// apiKey / apiSecretKey / scopes / hostName are read from the environment
// (SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SCOPES, HOST). The Shopify CLI injects
// these automatically during `npm run dev`; set them yourself in production.
const shopify = shopifyApp({
  api: {
    apiVersion: ApiVersion.April26,
  },
  auth: {
    path: "/api/auth",
    callbackPath: "/api/auth/callback",
  },
  webhooks: {
    path: "/api/webhooks",
  },
  sessionStorage,
});

export default shopify;
