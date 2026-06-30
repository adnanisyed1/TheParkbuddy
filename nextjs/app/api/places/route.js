// Park Buddy — places & recreation (RIDB / Recreation.gov).
// GET /api/places?lat=..&lng=..&q=..&radius=..  → nearby recreation areas & facilities
// across NPS, USFS, BLM, USACE, etc. (national forests, campgrounds, trailheads,
// OHV areas, boat launches, ski/snow areas, lakes).
//
// Needs a free RIDB key in env: RIDB_API_KEY (request at ridb.recreation.gov).
// All recreation data credit: Recreation.gov / Recreation Information Database (RIDB),
// U.S. federal land-management agencies (NPS, USFS, BLM, USACE, USFWS, USBR).

export const runtime = "nodejs";
export const revalidate = 3600; // 1 hour cache

const BASE = "https://ridb.recreation.gov/api/v1";

function num(v) { const n = parseFloat(v); return isFinite(n) ? n : null; }

async function ridb(path, params, key) {
  try {
    const url = BASE + path + "?" + new URLSearchParams(params).toString();
    const r = await fetch(url, { headers: { apikey: key, accept: "application/json" }, next: { revalidate: 3600 } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function GET(request) {
  const key = process.env.RIDB_API_KEY;
  const { searchParams } = new URL(request.url);
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));
  const q = (searchParams.get("q") || "").trim();
  const radius = Math.min(parseInt(searchParams.get("radius") || "50", 10) || 50, 200);

  if (!key) {
    return Response.json(
      { error: "RIDB_API_KEY is not set. Get a free key at ridb.recreation.gov.", facilities: [], recAreas: [] },
      { status: 200 }
    );
  }
  if (lat == null || lng == null) {
    return Response.json({ error: "lat and lng query params are required." }, { status: 400 });
  }

  const geo = { latitude: lat, longitude: lng, radius: radius, limit: "50" };

  // Two facility passes: a general nearby search + a camping-focused one (RIDB activity
  // 9 = CAMPING). Merging them surfaces far more campgrounds, since RIDB's generic
  // nearby search often returns non-camping facilities first.
  const [facD, facCampD, recD] = await Promise.all([
    ridb("/facilities", { ...geo, ...(q ? { query: q } : {}) }, key),
    ridb("/facilities", { ...geo, activity: "9" }, key),
    ridb("/recareas", { ...geo, ...(q ? { query: q } : {}) }, key),
  ]);

  const clean = (s, n) => String(s || "").replace(/<[^>]+>/g, "").slice(0, n || 200);

  const rawFac = [].concat((facCampD && facCampD.RECDATA) || [], (facD && facD.RECDATA) || []);
  const seenFac = {};
  const facilities = rawFac.map((f) => ({
    name: f.FacilityName,
    type: f.FacilityTypeDescription || "",
    description: clean(f.FacilityDescription, 220),
    lat: num(f.FacilityLatitude),
    lng: num(f.FacilityLongitude),
    reservable: !!f.Reservable,
    phone: f.FacilityPhone || "",
    url: f.FacilityID ? "https://www.recreation.gov/camping/campgrounds/" + f.FacilityID : "",
  })).filter((f) => {
    if (!f.name || f.lat == null || f.lng == null || (f.lat === 0 && f.lng === 0)) return false;
    const k = f.name.toLowerCase(); if (seenFac[k]) return false; seenFac[k] = 1; return true;
  });

  const recAreas = ((recD && recD.RECDATA) || []).map((r) => ({
    name: r.RecAreaName,
    description: clean(r.RecAreaDescription, 220),
    lat: num(r.RecAreaLatitude),
    lng: num(r.RecAreaLongitude),
    phone: r.RecAreaPhone || "",
    url: r.RecAreaID ? "https://www.recreation.gov/gateways/" + r.RecAreaID : "",
  })).filter((r) => r.name);

  // Fill the gap RIDB misses (state parks, private & dispersed sites): OpenStreetMap
  // tourism=camp_site near the point. Free, no key. De-dupe against RIDB by name.
  let osmCamps = [];
  try {
    const rM = Math.min(radius, 60) * 1609;
    const A = "(around:" + rM + "," + lat + "," + lng + ")";
    const oq = "[out:json][timeout:18];(" +
      'node["tourism"="camp_site"]["name"]' + A + ";" +
      'way["tourism"="camp_site"]["name"]' + A + ";" +
      ");out tags center 60;";
    const orsp = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ParkBuddy" },
      body: "data=" + encodeURIComponent(oq), next: { revalidate: 86400 },
    });
    if (orsp.ok) {
      const od = await orsp.json();
      const seenC = {};
      osmCamps = (od.elements || []).map((el) => {
        const t = el.tags || {}, c = el.center || el;
        return { name: t.name, type: "campground", description: t.operator || "State / local / private campground", lat: num(c.lat), lng: num(c.lon), url: t.website || "", source: "OpenStreetMap" };
      }).filter((c) => {
        if (!c.name || c.lat == null || c.lng == null) return false;
        const k = c.name.toLowerCase();
        if (seenC[k] || seenFac[k]) return false; seenC[k] = 1; return true;
      }).slice(0, 30);
    }
  } catch (e) { /* OSM best-effort */ }

  return Response.json({
    facilities: facilities.concat(osmCamps).slice(0, 70),
    recAreas: recAreas.slice(0, 20),
    credit: "Recreation.gov / RIDB (federal) + OpenStreetMap contributors (state/local/private campgrounds).",
  });
}
