"use client";
import EmbeddedSite from "../components/EmbeddedSite";

// Per-park live status page. Reads ?park=<id> exactly like the original.
export default function ParkStatusPage() {
  return <EmbeddedSite page="park-status" />;
}
