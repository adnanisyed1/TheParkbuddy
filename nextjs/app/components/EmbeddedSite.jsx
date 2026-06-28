"use client";

import { useEffect, useRef } from "react";

// Mounts one of your original ParkPulse pages inside Next.js, running its real
// markup + CSS + scripts unchanged. This is the faithful migration: nothing about
// your map / weather / trip logic was rewritten — it just lives under React routing now.
export default function EmbeddedSite({ page }) {
  const ref = useRef(null);
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return; // guard against React 18 strict-mode double effect
    booted.current = true;

    const base = `/embed/${page}`;
    const added = []; // track injected <head> nodes for cleanup
    // Cache-buster: ensures a fresh deploy's markup/css/scripts load without a
    // manual hard-refresh. Same-origin embed assets only; external CDNs untouched.
    const v = Date.now();
    const bust = (u) => (u && u.charAt(0) === "/") ? (u + (u.indexOf("?") < 0 ? "?" : "&") + "v=" + v) : u;

    function injectStyle(css) {
      const el = document.createElement("style");
      el.setAttribute("data-embed", page);
      el.textContent = css;
      document.head.appendChild(el);
      added.push(el);
    }
    function injectLink(href) {
      if (document.querySelector(`link[href="${href}"]`)) return;
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      document.head.appendChild(el);
      added.push(el);
    }
    function loadScript(src) {
      return new Promise((res) => {
        const el = document.createElement("script");
        el.src = src;
        el.async = false; // preserve execution order
        el.onload = res;
        el.onerror = res; // keep going even if an optional lib fails
        document.body.appendChild(el);
        added.push(el);
      });
    }

    (async () => {
      const manifest = await fetch(`${base}/manifest.json?v=${v}`, { cache: "no-store" }).then((r) => r.json());
      const [body, css] = await Promise.all([
        fetch(`${base}/body.html?v=${v}`, { cache: "no-store" }).then((r) => r.text()),
        fetch(`${base}/style.css?v=${v}`, { cache: "no-store" }).then((r) => r.text()),
      ]);

      // baseline so the page's `body{...}` (remapped to #embed-root) lays out full-height
      injectStyle("html,body{margin:0;padding:0;height:100%}#embed-root{min-height:100vh}");
      (manifest.cssLinks || []).forEach(injectLink);
      injectStyle(css);

      if (ref.current) {
        if (manifest.bodyClass) ref.current.className = manifest.bodyClass;
        ref.current.innerHTML = body; // markup only — scripts were extracted out
      }

      // run the page's scripts in original order, then fire the lifecycle events
      // the original code listens for (DOMContentLoaded / load).
      for (const src of manifest.scripts || []) {
        // eslint-disable-next-line no-await-in-loop
        await loadScript(bust(src));
      }
      try { document.dispatchEvent(new Event("DOMContentLoaded")); } catch (e) {}
      try { window.dispatchEvent(new Event("load")); } catch (e) {}
    })();

    return () => {
      booted.current = false; // allow a clean re-boot (React strict-mode remount) instead of leaving a torn-down page
      added.forEach((el) => el.parentNode && el.parentNode.removeChild(el));
    };
  }, [page]);

  return <div id="embed-root" ref={ref} />;
}
