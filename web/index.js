import { join } from "path";
import { readFileSync } from "fs";
import "dotenv/config";
import express from "express";
import serveStatic from "serve-static";
import compression from "compression";

import shopify from "./shopify.js";
import { connectMongo } from "./db/connect.js";
import Announcement from "./db/Announcement.js";
import { setAnnouncementMetafield } from "./services/metafield.js";

const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

await connectMongo();

const app = express();

app.use(compression());

// --- Shopify OAuth + webhooks ---
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: {} })
);

// --- All /api routes require a valid session ---
app.use("/api", shopify.validateAuthenticatedSession());
app.use(express.json());

// GET current announcement + recent history
app.get("/api/announcement", async (_req, res) => {
  try {
    const { shop } = res.locals.shopify.session;
    const history = await Announcement.find({ shop })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.status(200).json({
      announcement: history[0]?.text ?? "",
      history,
    });
  } catch (err) {
    console.error("Failed to load announcement:", err);
    res.status(500).json({ error: "Failed to load announcement" });
  }
});

// POST: save to MongoDB (audit history) AND sync to Shop metafield
app.post("/api/announcement", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const text = (req.body?.text ?? "").toString().trim();

    // 1. Save to MongoDB (creates audit history record with timestamp)
    const record = await Announcement.create({ shop: session.shop, text });

    // 2. Sync to Shopify → Shop metafield my_app.announcement
    await setAnnouncementMetafield(session, text);

    res.status(200).json({ ok: true, record });
  } catch (err) {
    console.error("Failed to save announcement:", err);
    res.status(500).json({ error: err.message || "Failed to save announcement" });
  }
});

// DELETE a single history record
app.delete("/api/announcement/:id", async (req, res) => {
  try {
    const { shop } = res.locals.shopify.session;
    await Announcement.deleteOne({ _id: req.params.id, shop });
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete announcement:", err);
    res.status(500).json({ error: err.message });
  }
});

app.use(shopify.cspHeaders());

if (process.env.NODE_ENV === "production") {
  app.use(serveStatic(STATIC_PATH, { index: false }));
  app.use(shopify.ensureInstalledOnShop(), (_req, res) => {
    res
      .status(200)
      .set("Content-Type", "text/html")
      .send(readFileSync(join(STATIC_PATH, "index.html")));
  });
}

app.listen(PORT, () => {
  console.log(`> FutureBlink announcement app running on port ${PORT}`);
});
