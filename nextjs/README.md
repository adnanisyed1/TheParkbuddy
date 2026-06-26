# ParkPulse — React / Next.js

Your existing ParkPulse site, migrated to **Next.js 14 + React 18** and ready to deploy on **Vercel**.

**Important: your site was not rewritten or redesigned.** Your real pages — the interactive
Google Maps homepage, the live weather + alerts, the per-park status page, the trip builder,
and the planner bubble — run exactly as you built them. They now live under React routing, and
your old Netlify function is now a Next.js API route. Nothing about the look or behavior changed.

## How the migration works

Each of your original pages was split into three parts that load together at runtime:
- the **markup** → `public/embed/<page>/body.html`
- the **styles** → `public/embed/<page>/style.css`
- the **scripts** (your real JS, untouched) → `public/embed/<page>/s0.js`, `s1.js`, …

A small React component (`app/components/EmbeddedSite.jsx`) mounts each page, loads its assets in
the original order, and fires the same `load` / `DOMContentLoaded` events your code listens for.

This is the safe, incremental ("strangler") migration: you get a real Next.js app today, and you
can refactor any page into idiomatic React components later, one piece at a time, without a risky
big-bang rewrite.

## Routes

| URL            | Your original file   |
|----------------|----------------------|
| `/`            | `index.html`         |
| `/park-status` | `park-status.html`   |
| `/build-trip`  | `build-trip.html`    |
| `/plan`        | `plan.html`          |
| `/api/nps`     | `netlify/functions/nps.js` |

Links and API calls were rewritten automatically (`park-status.html?park=5` → `/park-status?park=5`,
`/.netlify/functions/nps` → `/api/nps`). The `?park=` query param still works the same way.

## Project layout

```
nextjs/
  app/
    layout.js                 fonts + global reset
    globals.css               your :root theme variables
    page.js                   → /            (the map homepage)
    park-status/page.js       → /park-status
    build-trip/page.js        → /build-trip
    plan/page.js              → /plan
    components/EmbeddedSite.jsx
    api/nps/route.js          serverless NPS proxy (key stays secret)
  public/
    config.js, weather-fx.js, season-fx.js, trip-data.js
    embed/<page>/...          your extracted markup + css + scripts
  package.json
  next.config.mjs
  .env.example
```

## Run it locally

Requires **Node.js 18+** (https://nodejs.org).

```bash
cd nextjs
npm install
cp .env.example .env.local      # paste your NPS key into .env.local
npm run dev                     # http://localhost:3000
```

## Deploy to Vercel

1. Push this `nextjs/` folder to a **GitHub** repo.
2. https://vercel.com → **Add New… → Project** → import the repo.
3. **Settings → Environment Variables**:
   - `NPS_API_KEY` = your secret NPS key (https://www.nps.gov/subjects/developer)
4. **Deploy.** Add your deployed domain to the allowed referrers for your Google Maps key in
   Google Cloud Console so the map authorizes (it's in `public/config.js`).

> No GitHub? `npm i -g vercel`, then run `vercel` inside `nextjs/`.

## Notes

- The Google Maps homepage shows a grey/blank map until the deployed domain is added to your Maps
  key's allowed websites — that's a key-restriction setting, not a code issue.
- Live weather (weather.gov) and NPS boundary shading work as soon as the site is online.
- To go fully idiomatic React later, convert a page's `s*.js` logic into a component with
  `useState`/`useEffect` and replace its `EmbeddedSite` route — the rest keep working meanwhile.
