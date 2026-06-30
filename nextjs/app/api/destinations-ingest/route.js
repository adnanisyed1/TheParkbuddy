// Park Buddy — destinations ingest: state parks + national forests → Supabase `destinations`.
// GET/POST /api/destinations-ingest?all=1            loop all states (paged, 3 per call)
//          /api/destinations-ingest?state=Colorado   one state
//
// Source: OpenStreetMap via Overpass (named protected areas) — a free, programmatic stand-in
// for PAD-US that returns clean named state parks & national forests with center coords.
// Normalizes to our Destination model and UPSERTs into the `destinations` table with the
// SERVICE-ROLE key. Run on a schedule or page through manually like /api/ingest.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (+ optional INGEST_SECRET ?token=)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // allow long Overpass calls (Netlify/Next function timeout)

const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

const STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana",
  "Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana",
  "Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina",
  "North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia",
  "Wisconsin","Wyoming","Hawaii",
];
const ST_ABBR = { Alabama:"AL",Alaska:"AK",Arizona:"AZ",Arkansas:"AR",California:"CA",Colorado:"CO",Connecticut:"CT",Delaware:"DE",Florida:"FL",Georgia:"GA",Idaho:"ID",Illinois:"IL",Indiana:"IN",Iowa:"IA",Kansas:"KS",Kentucky:"KY",Louisiana:"LA",Maine:"ME",Maryland:"MD",Massachusetts:"MA",Michigan:"MI",Minnesota:"MN",Mississippi:"MS",Missouri:"MO",Montana:"MT",Nebraska:"NE",Nevada:"NV","New Hampshire":"NH","New Jersey":"NJ","New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",Ohio:"OH",Oklahoma:"OK",Oregon:"OR",Pennsylvania:"PA","Rhode Island":"RI","South Carolina":"SC","South Dakota":"SD",Tennessee:"TN",Texas:"TX",Utah:"UT",Vermont:"VT",Virginia:"VA",Washington:"WA","West Virginia":"WV",Wisconsin:"WI",Wyoming:"WY",Hawaii:"HI" };

const OVERPASS = "https://overpass-api.de/api/interpreter";

function slug(s){ return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

async function overpass(query) {
  let lastErr = "";
  for (const url of OVERPASS_MIRRORS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const r = await fetch(url, {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ParkBuddy/1.0 (destinations ingest)" },
        body: "data=" + encodeURIComponent(query),
      });
      clearTimeout(timer);
      if (r.ok) return r.json();
      lastErr = "overpass " + r.status;
    } catch (e) { clearTimeout(timer); lastErr = String(e.message || e); }
  }
  throw new Error(lastErr || "overpass failed");
}

async function fetchState(stateName) {
  // National forests + state parks as named protected areas within the state's admin area.
  const q = `[out:json][timeout:60];
area["name"="${stateName}"]["admin_level"="4"]["boundary"="administrative"]->.a;
(
  relation["boundary"="protected_area"]["name"~"National Forest"](area.a);
  way["boundary"="protected_area"]["name"~"National Forest"](area.a);
  relation["boundary"="protected_area"]["protection_title"~"State Park",i](area.a);
  relation["leisure"="park"]["name"~"State Park"](area.a);
  relation["boundary"="national_park"]["name"~"State Park"](area.a);
);
out center tags;`;
  const data = await overpass(q);
  const seen = {}, out = [];
  for (const el of (data.elements || [])) {
    const t = el.tags || {}; const name = t.name; if (!name) continue;
    const lat = el.lat || (el.center && el.center.lat), lng = el.lon || (el.center && el.center.lon);
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const isForest = /National Forest/i.test(name);
    const type = isForest ? "national_forest" : "state_park";
    const source = isForest ? "usfs" : "state";
    const id = (isForest ? "usfs:" : "state:") + ST_ABBR[stateName].toLowerCase() + "-" + slug(name);
    if (seen[id]) continue; seen[id] = 1;
    out.push({
      id, name, type, source, lat, lng, state: stateName,
      url: t.website || t.url || "", detail: t["description"] || "",
      tier: 1, fetched_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
  }
  return out;
}

async function upsert(sb, key, rows) {
  if (!rows.length) return 0;
  const resp = await fetch(sb + "/rest/v1/destinations?on_conflict=id", {
    method: "POST",
    headers: { apikey: key, Authorization: "Bearer " + key, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!resp.ok) throw new Error("supabase " + resp.status + " " + (await resp.text()).slice(0, 140));
  return rows.length;
}

export async function POST(request) {
  const sb = (process.env.SUPABASE_URL || "").replace(/\/+(rest(\/v1)?)?\/*$/i, ""), key = process.env.SUPABASE_SERVICE_KEY;
  if (!sb || !key) return Response.json({ error: "Set SUPABASE_URL and SUPABASE_SERVICE_KEY." }, { status: 500 });
  const { searchParams } = new URL(request.url);
  if (process.env.INGEST_SECRET && searchParams.get("token") !== process.env.INGEST_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const origin = new URL(request.url).origin;

  async function one(stateName) {
    try { const rows = await fetchState(stateName); const n = await upsert(sb, key, rows); return { state: stateName, upserted: n }; }
    catch (e) { return { state: stateName, error: String(e.message || e).slice(0, 140) }; }
  }

  if (searchParams.get("all")) {
    const offset = parseInt(searchParams.get("offset") || "0", 10) || 0;
    const batch = STATES.slice(offset, offset + 1); // 1 state/call — Overpass is slow; avoids 502 timeouts
    const results = [];
    for (const s of batch) results.push(await one(s));
    const total = results.reduce((a, r) => a + (r.upserted || 0), 0);
    const nextOffset = offset + 1, done = nextOffset >= STATES.length;
    return Response.json({ ok: true, batch: results.length, totalUpserted: total, results, done,
      next: done ? null : (origin + "/api/destinations-ingest?all=1&offset=" + nextOffset) });
  }

  const st = searchParams.get("state");
  if (!st) return Response.json({ error: "Provide ?state=<name> or ?all=1." }, { status: 400 });
  const out = await one(st);
  return Response.json({ ok: !out.error, ...out });
}

export async function GET(request) { return POST(request); }
