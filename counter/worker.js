/**
 * 剣の道 零 サポートサイト 訪問者カウンター
 *
 * 数えるのは「初めて訪れたブラウザの数」だけで、訪問者を見分けるための
 * 情報（IPアドレス、Cookie、UserAgent、閲覧履歴）は受け取らず、保存もしない。
 * 保存するのは2つの数字だけ。
 *   total          … これまでの累計
 *   day:YYYY-MM-DD … その日の分（日本時間。40日で自動的に消える）
 *
 * 同じ人を二重に数えないための判定は、訪問者の端末の中だけで行う
 * （index.html 側が localStorage を見て、初回のときだけ知らせてくる）。
 */

const ALLOWED_ORIGIN = "https://shusosai.github.io";
const DAY_KEY_TTL_SECONDS = 60 * 60 * 24 * 40;

export default {
  async fetch(request, env) {
    const headers = {
      "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
      "Cache-Control": "no-store",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "GET" && request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers });
    }

    const dayKey = `day:${tokyoDate(new Date())}`;

    if (request.method === "POST") {
      // "both" = 初めての訪問／"day" = 今日が初めて／それ以外は数えない
      const kind = (await request.text()).trim();
      if (kind === "both") {
        await increment(env, "total", null);
        await increment(env, dayKey, DAY_KEY_TTL_SECONDS);
      } else if (kind === "day") {
        await increment(env, dayKey, DAY_KEY_TTL_SECONDS);
      }
    }

    const [total, today] = await Promise.all([
      read(env, "total"),
      read(env, dayKey),
    ]);

    return new Response(JSON.stringify({ total, today }), {
      headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    });
  },
};

/** 日本時間の「今日」を YYYY-MM-DD で返す。 */
function tokyoDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function read(env, key) {
  const value = await env.COUNTER.get(key);
  const number = Number.parseInt(value ?? "0", 10);
  return Number.isFinite(number) ? number : 0;
}

/**
 * 1増やす。KVは同時に書き込むと取りこぼすことがあるが、
 * このサイトの訪問数では実害がないため、単純な読み書きで足りる。
 */
async function increment(env, key, ttlSeconds) {
  const next = (await read(env, key)) + 1;
  const options = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
  await env.COUNTER.put(key, String(next), options);
}
