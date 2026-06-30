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

  const geo = { latitude: lat, longitude: lng, radius: radius, limit: "20" };

  const [facD, recD] = await Promise.all([
    ridb("/facilities", { ...geo, ...(q ? { query: q } : {}) }, key),
    ridb("/recareas", { ...geo, ...(q ? { query: q } : {}) }, key),
  ]);

  const clean = (s, n) => String(s || "").replace(/<[^>]+>/g, "").slice(0, n || 200);

  const facilities = ((facD && facD.RECDATA) || []).map((f) => ({
    name: f.FacilityName,
    type: f.FacilityTypeDescription || "",
    description: clean(f.FacilityDescription, 220),
    lat: num(f.FacilityLatitude),
    lng: num(f.FacilityLongitude),
    reservable: !!f.Reservable,
    phone: f.FacilityPhone || "",
    url: f.FacilityID ? "https://www.recreation.gov/camping/campgrounds/" + f.FacilityID : "",
  })).filter((f) => f.name);

  const recAreas = ((recD && recD.RECDATA) || []).map((r) => ({
    name: r.RecAreaName,
    description: clean(r.RecAreaDescription, 220),
    lat: num(r.RecAreaLatitude),
    lng: num(r.RecAreaLongitude),
    phone: r.RecAreaPhone || "",
    url: r.RecAreaID ? "https://www.recreation.gov/gateways/" + r.RecAreaID : "",
  })).filter((r) => r.name);

  return Response.json({
    facilities: facilities.slice(0, 16),
    recAreas: recAreas.slice(0, 12),
    credit: "Recreation.gov / RIDB \u2014 U.S. federal land-management agencies (NPS, USFS, BLM, USACE, USFWS, USBR).",
  });
}
