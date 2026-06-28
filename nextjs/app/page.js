"use client";
import EmbeddedSite from "./components/EmbeddedSite";

// Homepage = the ParkBuddy bento launcher sitting over the live verdict map.
// The bento (explore-intro.js) is the home: tiles either reveal the map in-place
// or expand into their own pages. A home button returns to the bento.
export default function HomePage() {
  return <EmbeddedSite page="index" />;
}
