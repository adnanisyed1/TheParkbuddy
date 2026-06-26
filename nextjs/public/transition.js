/* ParkBuddy — cinematic page transitions.
   Plays a branded radial wipe out of the click point on navigation, and a reveal
   on load, so moving landing → explore → build-trip feels like one continuous space.
   Loaded on every page. Respects new-tab/modifier clicks, downloads, and anchors. */
(function () {
  if (window.__ppTrans) return;
  var DUR = 720;

  function make() {
    var d = document.getElementById("pp-trans");
    if (d) return d;
    d = document.createElement("div");
    d.id = "pp-trans";
    d.style.cssText = "position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;" +
      "background:linear-gradient(160deg,#1d4a37,#0e2a1d);pointer-events:none;will-change:clip-path;" +
      "clip-path:circle(0% at 50% 50%);transition:clip-path " + DUR + "ms cubic-bezier(.76,0,.24,1)";
    d.innerHTML = '<div id="pp-trans-mk" style="opacity:0;transition:opacity .4s ease;display:flex;flex-direction:column;align-items:center;gap:14px">' +
      '<div style="width:62px;height:62px;border-radius:18px;background:linear-gradient(145deg,#e4be78,#c79a4b);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.4)">' +
      '<svg width="30" height="30" viewBox="0 0 24 24" fill="#15241c"><path d="M12 2l5 9h-3l5 9H5l5-9H7z"></path><rect x="11" y="18" width="2" height="4"></rect></svg></div>' +
      '<div style="font-family:\'Spectral\',Georgia,serif;color:#fbf6ea;font-weight:700;font-size:1.25rem;letter-spacing:.02em">ParkBuddy</div></div>';
    document.body.appendChild(d);
    return d;
  }

  function reveal() {
    var d = make();
    var mk = d.querySelector("#pp-trans-mk");
    // start fully covering (no transition), then open to reveal the page
    d.style.transition = "none";
    d.style.clipPath = "circle(150% at 50% 50%)";
    if (mk) mk.style.opacity = "1";
    // force reflow then animate open
    void d.offsetWidth;
    requestAnimationFrame(function () {
      d.style.transition = "clip-path " + DUR + "ms cubic-bezier(.76,0,.24,1)";
      if (mk) mk.style.opacity = "0";
      d.style.clipPath = "circle(0% at 50% 50%)";
    });
    setTimeout(function () { d.style.pointerEvents = "none"; }, DUR);
  }

  function cover(x, y, cb) {
    var d = make();
    var mk = d.querySelector("#pp-trans-mk");
    var px = (x == null ? 50 : (x / innerWidth * 100));
    var py = (y == null ? 50 : (y / innerHeight * 100));
    d.style.pointerEvents = "auto";
    d.style.transition = "none";
    d.style.clipPath = "circle(0% at " + px + "% " + py + "%)";
    void d.offsetWidth;
    requestAnimationFrame(function () {
      d.style.transition = "clip-path " + DUR + "ms cubic-bezier(.76,0,.24,1)";
      if (mk) mk.style.opacity = "1";
      d.style.clipPath = "circle(150% at " + px + "% " + py + "%)";
    });
    setTimeout(function () { if (typeof cb === "function") cb(); }, DUR - 60);
  }

  // navigate with the cinematic cover (used by JS-driven nav, e.g. landing tiles)
  function go(href, x, y) { cover(x, y, function () { location.href = href; }); }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    var href = a.getAttribute("href");
    if (!href || href.charAt(0) === "#" || href.indexOf("javascript:") === 0) return;
    var url;
    try { url = new URL(a.href, location.href); } catch (err) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // same page / in-page
    e.preventDefault();
    go(a.href, e.clientX, e.clientY);
  }, true);

  window.__ppTrans = { reveal: reveal, cover: cover, go: go };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", reveal);
  else reveal();
})();
