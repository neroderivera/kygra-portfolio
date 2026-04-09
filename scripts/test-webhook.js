/**
 * Smoke-test script for the Notion webhook handler.
 *
 * Usage:
 *   1. Create a .env file in the project root with WEBHOOK_SECRET=<your secret>
 *   2. Replace PASTE_A_REAL_NOTION_PAGE_ID_HERE below with an actual Notion page ID
 *   3. Start the local Vercel dev server:  npx vercel dev
 *   4. Run this script:  node scripts/test-webhook.js
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ── Load .env manually (no external dependencies) ────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", ".env");

if (fs.existsSync(envPath)) {
  const envContents = fs.readFileSync(envPath, "utf-8");
  for (const line of envContents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// ── Configuration ────────────────────────────────────────────────────────────

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const TARGET_URL =
  process.env.WEBHOOK_URL || "http://localhost:3000/api/notion-webhook";

if (!WEBHOOK_SECRET) {
  console.error(
    "ERROR: WEBHOOK_SECRET is not set. Add it to a .env file or export it.",
  );
  process.exit(1);
}

// ── Build payload ────────────────────────────────────────────────────────────

const payload = {
  type: "page.updated",
  entity: {
    id: "PASTE_A_REAL_NOTION_PAGE_ID_HERE",
    type: "page",
  },
};

const body = JSON.stringify(payload);

// ── Compute HMAC-SHA256 signature ────────────────────────────────────────────

const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
hmac.update(body);
const signature = hmac.digest("hex");

// ── Send request ─────────────────────────────────────────────────────────────

console.log(`POST ${TARGET_URL}`);
console.log(`Payload: ${body}`);
console.log(`Signature: ${signature}`);
console.log("---");

try {
  const res = await fetch(TARGET_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-notion-signature": signature,
    },
    body,
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  try {
    console.log("Response:", JSON.parse(text));
  } catch {
    console.log("Response:", text);
  }
} catch (err) {
  console.error("Request failed:", err.message);
  process.exit(1);
}
