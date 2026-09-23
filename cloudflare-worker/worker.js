const STEAM_ID64 = "76561199578116138";
const ALLOWED_ORIGIN = "https://missing.website";
const STEAM_URL = `https://steamcommunity.com/inventory/${STEAM_ID64}/730/2?l=english&count=2000`;

function headers(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60, s-maxage=300",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
    if (request.method !== "GET" || url.pathname !== "/inventory")
      return new Response(JSON.stringify({ error: "not found" }), { status: 404, headers: headers(origin) });

    const cache = caches.default;
    const cacheKey = new Request(url.origin + "/inventory", { method: "GET" });
    const cached = await cache.match(cacheKey);
    if (cached) return cached;

    const upstream = await fetch(STEAM_URL, {
      headers: {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; missing.website inventory)"
      }
    });
    if (!upstream.ok) return new Response(JSON.stringify({ error: "steam upstream", status: upstream.status }), { status: 502, headers: headers(origin) });

    const body = await upstream.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch { return new Response(JSON.stringify({ error: "invalid steam response" }), { status: 502, headers: headers(origin) }); }
    if (!parsed || parsed.success !== 1) return new Response(JSON.stringify({ error: "steam inventory unavailable" }), { status: 502, headers: headers(origin) });

    const response = new Response(JSON.stringify(parsed), { status: 200, headers: headers(origin) });
    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};