import { randomUUID, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "lpu-campus-hub-community", region: "ap-southeast-1" });
const postTypes = new Set([
  "Event / meetup",
  "Mess update",
  "Lost & found",
  "Campus notice",
  "Study group",
]);
const allowedOrigins = new Set([
  "https://gleeful-vacherin-699b68.netlify.app",
  "https://iamaryaann.github.io",
]);

function json(req, payload, status = 200) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Vary": "Origin",
  };
  const origin = req.headers.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization";
    headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, OPTIONS";
    headers["Access-Control-Max-Age"] = "600";
  }
  return new Response(JSON.stringify(payload), { status, headers });
}

function adminAuthorized(req) {
  const secret = process.env.LPU_HUB_ADMIN_KEY || "";
  const supplied = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (secret.length < 24 || supplied.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(secret));
}

function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, maxLength);
}

function hasPrivateContact(text) {
  return /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:https?:\/\/|www\.)|(?:\+?\d[\d\s().-]{7,}\d)/i.test(text);
}

async function readAllPosts() {
  const { blobs } = await store.list({ prefix: "posts/" });
  const posts = await Promise.all(blobs.map(async ({ key }) => {
    const value = await store.get(key);
    if (!value) return null;
    try { return JSON.parse(value); } catch { return null; }
  }));
  return posts.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const config = { path: "/api/community" };

export default async function handler(req) {
  if (req.method === "OPTIONS") return json(req, { ok: true });
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    return json(req, { error: "Method not allowed." }, 405);
  }

  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins.has(origin)) return json(req, { error: "Origin not allowed." }, 403);

  if (req.method === "GET") {
    const allPosts = await readAllPosts();
    if (req.headers.has("authorization")) {
      if (!process.env.LPU_HUB_ADMIN_KEY) return json(req, { error: "Admin access has not been configured yet." }, 503);
      if (!adminAuthorized(req)) return json(req, { error: "Admin key is not valid." }, 401);
      return json(req, { posts: allPosts.filter(post => ["pending", "approved"].includes(post.status)).slice(0, 120) });
    }
    return json(req, { posts: allPosts.filter(post => post.status === "approved").slice(0, 80) });
  }

  if (req.method === "POST") {
    let body;
    try {
      const raw = await req.text();
      if (new TextEncoder().encode(raw).length > 6000) return json(req, { error: "Post is too large." }, 413);
      body = JSON.parse(raw);
    } catch {
      return json(req, { error: "Enter a valid post." }, 400);
    }

    if (cleanText(body?.company, 120)) return json(req, { ok: true, message: "Submitted for review." }, 202);
    const type = cleanText(body?.type, 40);
    const title = cleanText(body?.title, 80);
    const location = cleanText(body?.location, 80);
    const details = cleanText(body?.details, 400);
    const date = cleanText(body?.date, 10);
    const combinedText = `${title} ${location} ${details}`;
    const dateTime = new Date(`${date}T12:00:00Z`);

    if (!postTypes.has(type) || title.length < 4 || details.length < 12 || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(dateTime.valueOf())) {
      return json(req, { error: "Check the post type, date, title and details, then try again." }, 400);
    }
    if (dateTime.toISOString().slice(0, 10) !== date) return json(req, { error: "Enter a valid date." }, 400);
    if (hasPrivateContact(combinedText)) return json(req, { error: "Remove phone numbers, email addresses and web links before sharing." }, 400);

    const existing = await store.list({ prefix: "posts/" });
    if (existing.blobs.length >= 1000) return json(req, { error: "The shared board is full. Contact the app owner." }, 429);

    const post = {
      id: randomUUID(),
      type,
      date,
      title,
      location,
      details,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await store.set(`posts/${post.id}`, JSON.stringify(post), { onlyIfNew: true });
    return json(req, { ok: true, message: "Submitted for admin review.", id: post.id }, 202);
  }

  if (!adminAuthorized(req)) {
    return json(req, { error: process.env.LPU_HUB_ADMIN_KEY ? "Admin key is not valid." : "Admin access has not been configured yet." }, process.env.LPU_HUB_ADMIN_KEY ? 401 : 503);
  }

  let body;
  try { body = await req.json(); } catch { return json(req, { error: "Enter a valid moderation action." }, 400); }
  const id = cleanText(body?.id, 80);
  const status = cleanText(body?.status, 20);
  if (!/^[0-9a-f-]{36}$/i.test(id) || !["approved", "rejected"].includes(status)) {
    return json(req, { error: "Choose a valid post and action." }, 400);
  }
  const key = `posts/${id}`;
  const value = await store.get(key);
  if (!value) return json(req, { error: "Post not found." }, 404);
  const post = JSON.parse(value);
  post.status = status;
  post.reviewedAt = new Date().toISOString();
  await store.set(key, JSON.stringify(post));
  return json(req, { ok: true, post });
}
