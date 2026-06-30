// Park Buddy — AI trip-planning agent (server-side).
// ----------------------------------------------------------------------------
// POST /api/agent  with JSON body { message: string, history?: Message[] }
//
// Runs a standard tool-use agent loop entirely on the server, so neither the
// Anthropic key nor the NPS key is ever exposed to the browser. The model can
// call a real NPS search tool, and we feed the results back until it produces a
// final text answer — so trip advice is grounded in live park data, not guesses.
//
// Env vars (set in the Netlify dashboard, NOT in code):
//   ANTHROPIC_API_KEY  — your Anthropic API key (console.anthropic.com)
//   NPS_API_KEY        — your NPS key (developer.nps.gov) — already used by /api/nps
// ----------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";

// Force the Node.js runtime (the SDK needs Node, not the Edge runtime) and never
// cache agent responses.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// --- Easy-to-change knobs ----------------------------------------------------
// Swap to "claude-sonnet-4-6" if Haiku's answers feel too thin. Haiku is ~1¢/turn.
const MODEL = "claude-haiku-4-5-20251001";
const MAX_STEPS = 6;        // hard cap on agent loop rounds (protects the function timeout)
const MAX_TOKENS = 1024;    // cap on each model response
const RATE_LIMIT = 8;       // requests per IP per window
const RATE_WINDOW_MS = 60_000; // 1 minute

const SYSTEM_PROMPT = `You are Park Buddy's trip-planning assistant — a warm, concise guide to all 63 U.S. national parks.

Your job: help people decide where to go, AND actually build their trip on the page they're looking at.

Rules:
- For any question about specific parks, conditions, activities, fees, or "which park should I…", call search_parks FIRST and base your answer on what it returns. Never invent park details.
- When the user wants to plan or build a trip ("plan me 4 days in Utah", "add Zion", "build a Colorado trip with kids"), use the ACTION tools to do it for real: build_itinerary to assemble a whole route, add_park to add one, set_trip_details for dates/travelers/name, generate_checklist to draft their packing list, save_passport to make the PDF. Prefer build_itinerary when they describe a multi-park trip.
- When the user asks what to pack/bring, or to add things to their list, use add_checklist_items: analyze the trip context (parks, season, conditions) and add specific, useful items with the right category (pack/grab/do) and a short reason. Don't duplicate items already on their list.
- SAFETY-FIRST FOR RISKY DAYS: Give an honest verdict, but never just say "don't go." Many people go anyway. Whenever conditions are marginal or a no-go (heat, storms, snow/ice, flash-flood risk, smoke, cold, remoteness), briefly state the risk, then proactively offer a precautionary kit — "If you still go, carry these" — and use add_checklist_items to add the specific safety gear that addresses that exact hazard (e.g. flash-flood: check forecast + avoid slot canyons + start early; heat: 1 gal water/person + electrolytes + sun protection; cold/snow: insulated layers + traction + emergency blanket; smoke: N95 masks; remote: offline map + extra food/water + first-aid + tell someone your plan). Keep people safe, not home.
- Only put REAL U.S. National Park names in itineraries (use search_parks to confirm names and states first).
- After taking actions, tell the user plainly what you did ("I added Zion, Bryce and Capitol Reef and set 6 days"). Keep it short and friendly.
- If the data doesn't cover something (live weather, today's closures), say so and point them to that park's live status page rather than guessing.
- Never output raw JSON or mention "tools" — just talk naturally.`;

// search_parks runs on the SERVER (real NPS call). The action tools are applied in
// the BROWSER — the server just records them and returns the list so the widget
// can drive the trip-builder UI. Keeps planning grounded, makes the page actually move.
const TOOLS = [
  {
    name: "search_parks",
    description:
      "Search the National Park Service for parks matching a free-text query (and optionally a US state). Returns up to 5 parks with name, states, a short description, and the official URL. Use this to ground any recommendation and to confirm exact park names before building an itinerary.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: 'What to search for, e.g. "fall hiking", "kid friendly", "desert", or a park name.' },
        stateCode: { type: "string", description: 'Optional two-letter US state code, e.g. "CO", "UT".' },
      },
      required: ["query"],
    },
  },
  {
    name: "build_itinerary",
    description: "Build or replace the user's trip on the page with an ordered list of national parks. Use for multi-park trips. Optionally set start date, number of travelers, and a trip name.",
    input_schema: {
      type: "object",
      properties: {
        parks: { type: "array", items: { type: "string" }, description: "Ordered list of exact US National Park names, e.g. [\"Zion\",\"Bryce Canyon\",\"Capitol Reef\"]." },
        startDate: { type: "string", description: "Optional ISO date YYYY-MM-DD." },
        travelers: { type: "number", description: "Optional number of travelers." },
        tripName: { type: "string", description: "Optional friendly trip name." },
      },
      required: ["parks"],
    },
  },
  {
    name: "add_park",
    description: "Add a single national park to the current trip without clearing it.",
    input_schema: { type: "object", properties: { park: { type: "string", description: "Exact US National Park name." }, nights: { type: "number", description: "Optional nights to stay." } }, required: ["park"] },
  },
  {
    name: "set_trip_details",
    description: "Set the trip's start date, traveler count, and/or name without changing the parks.",
    input_schema: { type: "object", properties: { startDate: { type: "string" }, travelers: { type: "number" }, tripName: { type: "string" } }, required: [] },
  },
  {
    name: "generate_checklist",
    description: "Generate the Pack & Go packing/checklist for the current trip (reads the stops, dates and conditions).",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "add_checklist_items",
    description:
      "Analyze the trip and add specific items to the user's Pack & Go checklist. Use when the user asks 'what should I pack/bring', 'add X to my list', or wants help getting ready. Each item has a category: 'pack' (pack at home), 'grab' (buy on the way), or 'do' (at the destination). Base items on the actual parks, season and conditions in the provided trip context.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          description: "Checklist items to add.",
          items: {
            type: "object",
            properties: {
              cat: { type: "string", enum: ["pack", "grab", "do"], description: "When/where it happens." },
              label: { type: "string", description: "Short item name, under 6 words." },
              note: { type: "string", description: "Optional one-line reason, e.g. 'cold dawn at Zion'." },
            },
            required: ["cat", "label"],
          },
        },
      },
      required: ["items"],
    },
  },
  {
    name: "save_passport",
    description: "Generate the downloadable Trip Passport PDF (full itinerary) for the current trip.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

// Names of tools that are applied client-side (recorded, not executed on the server).
const ACTION_TOOLS = { build_itinerary: 1, add_park: 1, set_trip_details: 1, generate_checklist: 1, save_passport: 1, add_checklist_items: 1 };

// --- The real tool implementation -------------------------------------------
// Calls the NPS API server-side and trims each result so we don't dump the full
// (huge) payload into the model's context.
async function searchParks({ query, stateCode }) {
  const key = process.env.NPS_API_KEY;
  if (!key) return { error: "NPS_API_KEY is not configured on the server." };

  const params = new URLSearchParams({ q: query || "", limit: "5", api_key: key });
  if (stateCode) params.set("stateCode", String(stateCode).toUpperCase());

  try {
    const r = await fetch("https://developer.nps.gov/api/v1/parks?" + params.toString(), {
      headers: { "User-Agent": "ParkBuddy-Agent" },
    });
    if (!r.ok) return { error: "NPS request failed with status " + r.status };
    const data = await r.json();
    const parks = (data.data || []).map((p) => ({
      name: p.fullName,
      states: p.states,
      description: (p.description || "").slice(0, 300),
      url: p.url,
    }));
    return { count: parks.length, parks };
  } catch (e) {
    return { error: "NPS request error: " + (e?.message || String(e)) };
  }
}

// --- Simple in-memory per-IP rate limit -------------------------------------
// NOTE: in-memory only — fine for a single warm function instance, but it RESETS
// on cold start and is NOT shared across concurrent instances. For a durable,
// shared limit and a daily spend ceiling, move this to Upstash Redis or Netlify
// Blobs (store {count, windowStart} per IP, and a global daily counter).
const hits = new Map(); // ip -> { count, windowStart }
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now - rec.windowStart > RATE_WINDOW_MS) {
    hits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  rec.count += 1;
  return rec.count > RATE_LIMIT;
}

function clientIp(request) {
  const xf = request.headers.get("x-forwarded-for") || request.headers.get("x-nf-client-connection-ip");
  return (xf ? xf.split(",")[0] : "").trim() || "unknown";
}

// --- POST handler ------------------------------------------------------------
export async function POST(request) {
  // Rate limit
  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many requests — please wait a moment and try again." },
      { status: 429 }
    );
  }

  // Validate body
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const message = body && typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return Response.json({ error: "Body must include a non-empty 'message' string." }, { status: 400 });
  }
  // Optional prior turns: [{ role: "user"|"assistant", content: "..." }]
  const history = Array.isArray(body.history)
    ? body.history
        .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-8)
    : [];

  // Optional live page context (current trip + checklist) so the agent can analyze
  // what's already planned and add only what's missing.
  let contextNote = "";
  if (body && body.context && typeof body.context === "object") {
    try {
      const t = body.context.trip, c = body.context.checklist;
      const bits = [];
      if (t && Array.isArray(t.stops) && t.stops.length) {
        bits.push("Current trip: " + t.stops.join(" \u2192 ") + (t.startDate ? " (starts " + t.startDate + ")" : "") + (t.travelers ? ", " + t.travelers + " travelers" : "") + ".");
      }
      if (c && typeof c.total === "number") {
        bits.push("Checklist has " + c.total + " items" + (Array.isArray(c.items) && c.items.length ? ": " + c.items.map(function (i) { return i.label; }).slice(0, 30).join(", ") : "") + ".");
      }
      if (bits.length) contextNote = "\n\n[Live page context \u2014 use this to tailor and avoid duplicates]\n" + bits.join("\n");
    } catch (e) {}
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error("[agent] ANTHROPIC_API_KEY is not set.");
    return Response.json({ error: "The assistant is not configured yet." }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: key });

  // Build the conversation. Prompt caching on the system prompt + tools (both
  // repeat on every call) cuts cost — Anthropic caches the stable prefix.
  const messages = [...history, { role: "user", content: message + contextNote }];

  try {
    let finalText = "";
    const actions = []; // client-side actions to apply on the page (build trip, etc.)

    for (let step = 0; step < MAX_STEPS; step++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tools: TOOLS.map((t, i) =>
          // mark the LAST tool with cache_control so the whole tools block is cached
          i === TOOLS.length - 1 ? { ...t, cache_control: { type: "ephemeral" } } : t
        ),
        messages,
      });

      // Collect any text the model produced this round.
      const textParts = response.content.filter((c) => c.type === "text").map((c) => c.text);
      if (textParts.length) finalText = textParts.join("\n").trim();

      // If the model wants to use tools, run them and loop.
      const toolUses = response.content.filter((c) => c.type === "tool_use");
      if (response.stop_reason === "tool_use" && toolUses.length) {
        // Append the assistant's tool-use turn verbatim.
        messages.push({ role: "assistant", content: response.content });

        // Execute each requested tool and gather results.
        const toolResults = [];
        for (const tu of toolUses) {
          let result;
          if (tu.name === "search_parks") {
            result = await searchParks(tu.input || {});
          } else if (ACTION_TOOLS[tu.name]) {
            // Record for the browser to apply; ack optimistically so the model continues.
            actions.push({ name: tu.name, input: tu.input || {} });
            result = { ok: true, applied: "on the user's page", tool: tu.name };
          } else {
            result = { error: "Unknown tool: " + tu.name };
          }
          toolResults.push({
            type: "tool_result",
            tool_use_id: tu.id,
            content: JSON.stringify(result),
          });
        }
        messages.push({ role: "user", content: toolResults });
        continue; // loop again so the model can read the results
      }

      // No tool use → this is the final answer.
      return Response.json({ reply: finalText || "Sorry, I couldn't find an answer for that.", actions });
    }

    // Hit the step cap — return whatever text we have so far.
    return Response.json({
      reply: finalText || "That took a few too many steps — try narrowing your question.",
      actions,
      truncated: true,
    });
  } catch (e) {
    console.error("[agent] failure:", e?.message || e);
    return Response.json({ error: "The assistant ran into a problem. Please try again." }, { status: 500 });
  }
}

// Optional: a friendly GET so visiting the route in a browser doesn't 405.
export async function GET() {
  return Response.json({ ok: true, hint: "POST { message } to chat with the Park Buddy agent." });
}
