# Shopify Announcement Banner App (MERN + Theme App Extension)

A Shopify embedded app that lets a merchant type an announcement in the Admin and
have it appear as a banner on **every** storefront page.

```
Admin (React/Polaris)  ->  Express API  ->  MongoDB (audit history)
                                        ->  Shopify Admin API -> Shop metafield (my_app.announcement)
                                                                      |
                                            Theme App Extension (App Embed) reads it in Liquid
                                                                      v
                                                              Storefront banner
```

**Stack:** MongoDB · Express · React · Node.js (MERN) + Shopify Theme App Extension.
No ScriptTags are used — the storefront reads the value from a Shop metafield, as required.

---

## Features

- **Admin dashboard** (React + Shopify Polaris) with an "Announcement Text" field and a **Save** button.
- On **Save** the backend:
  1. Stores the text + timestamp in **MongoDB** (a new document each time = audit history).
  2. Syncs the text into the **Shop metafield** `my_app.announcement` via the Admin **GraphQL** API.
- **Theme App Extension** with an **App Embed Block** that reads the metafield in Liquid and floats a banner on every page.
- Shopify sessions are also persisted in MongoDB (keeps everything on the MERN stack).

---

## Repository layout

```
.
├── shopify.app.toml                 # Shopify app config (CLI-managed)
├── package.json                     # root scripts + local Shopify CLI
├── web/                             # Express backend + React frontend
│   ├── index.js                     # Express server, OAuth, API routes
│   ├── shopify.js                   # Shopify API + MongoDB session storage
│   ├── db/
│   │   ├── connect.js               # Mongoose connection
│   │   └── Announcement.js          # Announcement schema (audit history)
│   ├── services/
│   │   └── metafield.js             # Writes the my_app.announcement metafield
│   └── frontend/                    # React + Vite + Polaris dashboard
│       └── src/AnnouncementPage.jsx
└── extensions/
    └── announcement-banner/         # Theme App Extension
        └── blocks/announcement-banner.liquid   # App Embed Block
```

---

## Prerequisites (what YOU need to set up)

1. **Shopify Partner account** — https://partners.shopify.com (free).
2. **Development store** — create one from the Partner Dashboard (Stores → Add store → Development store).
3. **MongoDB** — either:
   - **MongoDB Atlas** (free M0 tier) → copy the connection string, **or**
   - a local MongoDB running at `mongodb://127.0.0.1:27017`.
4. **Node.js 18+** and **npm** (Node 20/22 recommended).

> You do **not** need to install the Shopify CLI globally — it's a local dependency of this project.

---

## Local setup

```bash
# 1. Install root dependencies (this includes the Shopify CLI)
npm install

# 2. Install backend + frontend dependencies
cd web && npm install
cd frontend && npm install
cd ../..

# 3. Configure MongoDB
#    Copy the example env file and fill in your connection string
cp web/.env.example web/.env
#    then edit web/.env and set MONGODB_URI=...
```

### Run it

```bash
npm run dev
```

The first time, the Shopify CLI will:

1. Ask you to **log in** to your Partner account.
2. Offer to **create a new app** (choose this) — it writes your `client_id` into `shopify.app.toml`.
3. Start a secure tunnel and update the app URLs automatically.
4. Print a URL like `https://…trycloudflare.com` — open it and **install the app on your development store**.

You'll land on the **Announcement Banner** page in the Shopify Admin. Type a message, click **Save**.

> During `npm run dev`, the CLI injects `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`
> and `HOST` automatically. You only set `MONGODB_URI` (and `MONGODB_DB`) yourself in `web/.env`.

### Enable the storefront banner (one-time, per store)

The App Embed Block must be turned on in the theme:

1. In the Admin: **Online Store → Themes → Customize**.
2. Open **App embeds** (bottom-left toggle icon).
3. Enable **Announcement Banner**, optionally tweak colors, and **Save**.
4. Visit the storefront — the banner shows the text you saved.

> If the banner text doesn't appear, save the announcement once from the app first
> (this also creates the metafield definition that exposes the value to Liquid).

---

## How the pieces connect

| Step | File | What happens |
|------|------|--------------|
| Save clicked | `web/frontend/src/AnnouncementPage.jsx` | `POST /api/announcement { text }` |
| Save to DB | `web/index.js` + `web/db/Announcement.js` | New document `{ shop, text, createdAt }` |
| Sync to Shopify | `web/services/metafield.js` | `metafieldsSet` writes `my_app.announcement` (SHOP owner) |
| Display | `extensions/announcement-banner/blocks/announcement-banner.liquid` | `{{ shop.metafields.my_app.announcement.value }}` |

---

## Deployment

**Backend → Render (example) + MongoDB Atlas**

1. Push this repo to GitHub (public).
2. Create a MongoDB Atlas cluster and copy its connection string.
3. In the **Partner dashboard**, open your app → **API credentials** → copy the API key & secret.
4. On Render, create a **Web Service** from the repo with:
   - **Root Directory:** `web`
   - **Build Command:** `npm install && npm install --prefix frontend && npm run build --prefix frontend`
   - **Start Command:** `npm run serve`
   - **Environment variables:**
     ```
     MONGODB_URI=<your atlas uri>
     MONGODB_DB=futureblink_shopify
     SHOPIFY_API_KEY=<from partner dashboard>
     SHOPIFY_API_SECRET=<from partner dashboard>
     SCOPES=read_products,write_products,write_themes
     HOST=<your render url, e.g. https://your-app.onrender.com>
     ```
5. Set the app's **App URL** and **Allowed redirection URL** in the Partner dashboard to your
   Render URL (`https://your-app.onrender.com` and `…/api/auth/callback`), or run
   `npm run deploy` to push config + the theme extension.
6. Deploy the theme extension: `npm run deploy`.

---

## Notes / design decisions

- **GraphQL Admin API** (`metafieldsSet`) is used for the metafield write; a metafield
  **definition** with `storefront: PUBLIC_READ` is created so the value is reliably
  readable from Liquid.
- **No ScriptTags** — the storefront reads the metafield directly, per the task requirement.
- **MongoDB stores full history** — each save is a new record, so the `Announcement`
  collection is an audit log. The latest record pre-fills the form.
- **App Bridge** (loaded from Shopify's CDN in `index.html`) embeds the app and attaches
  a session token to every `fetch` call, which the backend validates.
