/* ParkBuddy — Explore cinematic intro. Injects a premium hero overlay that
   matches the landing (sunset sky, ridge silhouette, serif headline), then lifts
   to reveal the live map. Self-contained; loaded on the Explore page only. */
(function () {
  if (window.__ppExploreIntro) return;
  window.__ppExploreIntro = true;

  var SERIF = "'Spectral',Georgia,serif";
  var SANS = "'Hanken Grotesk',system-ui,sans-serif";

  function inject() {
    if (document.getElementById("ex-intro")) return;
    var ov = document.createElement("div");
    ov.id = "ex-intro";
    ov.style.cssText = "position:fixed;inset:0;z-index:9000;overflow:hidden;color:#fbf6ea;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;" +
      "transition:transform .9s cubic-bezier(.76,0,.24,1),opacity .6s ease .3s;will-change:transform";
    ov.innerHTML =
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg,#f7b267 0%,#e76f51 50%,#7d4a3a 100%)"></div>' +
      '<div style="position:absolute;left:18%;top:24%;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,#fff3d6,rgba(255,243,214,0) 70%);filter:blur(2px)"></div>' +
      '<div style="position:absolute;left:-6%;right:-6%;bottom:0;height:46%;background:#b5562f;opacity:.92;clip-path:polygon(0 60%,18% 44%,34% 56%,52% 38%,70% 54%,86% 42%,100% 56%,100% 100%,0 100%)"></div>' +
      '<div style="position:absolute;left:-6%;right:-6%;bottom:0;height:34%;background:#8a3d24;opacity:.9;clip-path:polygon(0 70%,22% 58%,44% 70%,64% 56%,82% 66%,100% 58%,100% 100%,0 100%)"></div>' +
      '<div style="position:absolute;left:-6%;right:-6%;bottom:0;height:22%;background:#5e2c1c;clip-path:polygon(0 60%,30% 50%,60% 60%,100% 50%,100% 100%,0 100%)"></div>' +
      '<div style="position:relative;z-index:2;padding:24px">' +
        '<div style="display:inline-flex;align-items:center;gap:9px;background:rgba(20,36,28,.4);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:8px 16px;font-family:' + SANS + ';font-size:.76rem;font-weight:700;letter-spacing:.06em;margin-bottom:20px">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:#e4be78;box-shadow:0 0 0 4px rgba(228,190,120,.25)"></span>PARKBUDDY · EXPLORE</div>' +
        '<h1 style="font-family:' + SERIF + ';font-weight:800;font-size:clamp(2.6rem,7vw,5rem);line-height:.98;letter-spacing:-.02em;margin:0;text-shadow:0 4px 30px rgba(0,0,0,.35)">Find your <em style="font-style:italic;color:#e4be78">wild.</em></h1>' +
        '<p style="font-family:' + SANS + ';font-size:clamp(1rem,1.7vw,1.18rem);margin-top:16px;color:rgba(251,246,234,.9);text-shadow:0 2px 14px rgba(0,0,0,.35)">63 national parks · live conditions · real-road trips</p>' +
        '<div style="width:200px;height:3px;border-radius:999px;background:rgba(255,255,255,.25);margin:26px auto 0;overflow:hidden"><i id="ex-bar" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#e4be78,#c79a4b);transition:width 1.5s cubic-bezier(.4,0,.2,1)"></i></div>' +
        '<div style="font-family:' + SANS + ';font-size:.72rem;color:rgba(251,246,234,.7);margin-top:12px;letter-spacing:.04em">Loading the map…</div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(ov);
    requestAnimationFrame(function () { var b = document.getElementById("ex-bar"); if (b) b.style.width = "100%"; });

    var lifted = false;
    function lift() {
      if (lifted) return; lifted = true;
      ov.style.transform = "translateY(-104%)";
      ov.style.opacity = "0";
      setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 1100);
    }
    ov.addEventListener("click", lift);
    // lift once the map is ready, or after a max hold
    var t0 = Date.now();
    var poll = setInterval(function () {
      var ready = window.mapReady === true || (window.gmap && document.querySelector("#lmap .gm-style"));
      if (ready && Date.now() - t0 > 1300) { clearInterval(poll); lift(); }
      else if (Date.now() - t0 > 2600) { clearInterval(poll); lift(); }
    }, 200);
  }

  if (document.body) inject();
  else document.addEventListener("DOMContentLoaded", inject);
})();
