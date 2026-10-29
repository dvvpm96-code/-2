import { getStore } from "@netlify/blobs";

const HEADERS = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" };
const out = (status, obj) => new Response(JSON.stringify(obj), { status, headers: HEADERS });

export default async (req) => {
  // Необязательный код доступа: задайте переменную окружения BOARD_KEY в настройках сайта Netlify
  const need = process.env.BOARD_KEY;
  if (need && req.headers.get("x-board-key") !== need) return out(401, { error: "unauthorized" });

  const store = getStore({ name: "project-map", consistency: "strong" });

  if (req.method === "GET") {
    return out(200, (await store.get("board", { type: "json" })) ?? null);
  }

  if (req.method === "PUT") {
    let b;
    try { b = await req.json(); } catch { return out(400, { error: "bad json" }); }
    if (typeof b.json !== "string" || b.json.length > 4_000_000) return out(400, { error: "bad payload" });
    const cur = await store.get("board", { type: "json" });
    const curRev = cur ? Number(cur.rev) || 0 : 0;
    if (curRev !== Number(b.rev)) return out(409, { error: "conflict", rev: curRev });
    await store.setJSON("board", { rev: curRev + 1, json: b.json, by: String(b.by || "").slice(0, 40), at: Date.now() });
    return out(200, { rev: curRev + 1 });
  }

  return out(405, { error: "method not allowed" });
};
