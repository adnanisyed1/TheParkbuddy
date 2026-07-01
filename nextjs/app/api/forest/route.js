// Park Buddy — national-forest (and other federal rec area) DETAIL from Recreation.gov / RIDB.
// GET /api/forest?name=White River National Forest&lat=..&lng=..
//   → the forest's own rec-area record: description, activities, directions, contact,
//     official link, and its campgrounds. Fills the sections that used to just say
//     "see the official page" for anything that isn't an NPS national park.
//
// Needs RIDB_API_KEY (free, ridb.recreation.gov). Degrades to {found:false} without it,
// so the page keeps its link-out fallback. Credit: Recreation.gov / RIDB (federal agencies).

export const runtime = "nodejs";
export const revalidate = 86400;

const BASE = "https://ridb.recreation.gov/api/v1";

function num(v) { const n = parseFloat(v); return isFinite(n) ? n : null; }
function clean(s, n) { return String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, n || 400); }
function normName(s) { return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, ""); }

async function ridb(path, params, key) {
  try {
    const url = BASE + path + "?" + new URLSearchParams(params).toString();
    const r = await fetch(url, { headers: { apikey: key, accept: "application/json" }, next: { revalidate: 86400 } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function GET(request) {
  const key = process.env.RIDB_API_KEY;
  const { searchParams } = new URL(request.url);
  const name = (searchParams.get("name") || "").trim();
  const lat = num(searchParams.get("lat"));
  const lng = num(searchParams.get("lng"));
  if (!key) return Response.json({ found: false, note: "RIDB_API_KEY not configured" });
  if (!name && (lat == null || lng == null)) {
    return Response.json({ error: "name or lat/lng required" }, { status: 400 });
  }

  // Find the matching rec area: search by name, biased to the forest's location. full=true
  // returns the ACTIVITY list and links inline so we don't need a second round-trip.
  const geo = (lat != null && lng != null) ? { latitude: lat, longitude: lng, radius: "75" } : {};
  const search = await ridb("/recareas", { query: name, ...geo, limit: "25", full: "true" }, key);
  const list = (search && search.RECDATA) || [];
  if (!list.length) return Response.json({ found: false });

  // Best match: exact/contains name match wins; otherwise the first (RIDB sorts by relevance).
  const target = normName(name);
  let best = list.find((r) => normName(r.RecAreaName) === target)
    || list.find((r) => target && normName(r.RecAreaName).indexOf(target) >= 0)
    || list.find((r) => { const n = normName(r.RecAreaName); return target && n && target.indexOf(n) >= 0; })
    || list[0];

  const activities = ((best.ACTIVITY || best.activities || []).map((a) => a.ActivityName || a.activityName).filter(Boolean));
  const links = (best.LINK || []).map((l) => ({ title: l.Title, url: l.URL, type: l.LinkType })).filter((l) => l.url);
  const official = (links.find((l) => /official|home|web/i.test(l.type + " " + l.title)) || links[0] || {}).url || "";

  // Campgrounds within this rec area.
  let campgrounds = [];
  if (best.RecAreaID) {
    const fac = await ridb("/recareas/" + best.RecAreaID + "/facilities", { limit: "60" }, key);
    const rows = (fac && fac.RECDATA) || [];
    const seen = {};
    campgrounds = rows
      .filter((f) => /camp/i.test((f.FacilityTypeDescription || "") + " " + (f.FacilityName || "")))
      .map((f) => ({
        name: f.FacilityName,
        description: clean(f.FacilityDescription, 200),
        reservable: !!f.Reservable,
        url: f.FacilityID ? "https://www.recreation.gov/camping/campgrounds/" + f.FacilityID : "",
      }))
      .filter((c) => { if (!c.name) return false; const k = c.name.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; })
      .slice(0, 12);
  }

  return Response.json({
    found: true,
    id: best.RecAreaID,
    name: best.RecAreaName,
    description: clean(best.RecAreaDescription, 700),
    directions: clean(best.RecAreaDirections, 500),
    phone: (best.RecAreaPhone || "").trim(),
    email: (best.RecAreaEmail || "").trim(),
    official,
    reservationUrl: best.RecAreaID ? "https://www.recreation.gov/search?q=" + encodeURIComponent(best.RecAreaName) : "",
    activities,
    campgrounds,
    credit: "Recreation.gov / RIDB — U.S. Forest Service, BLM & partner agencies.",
  });
}
