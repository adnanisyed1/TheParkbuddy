/* ParkBuddy — Bento launcher home. The home IS this cover, sitting over the live
   verdict map. Tiles either REVEAL the map in-place (lift the cover) or EXPAND into
   their own page via the smooth transition. A home button brings the bento back.
   Self-contained; loaded on the Explore (index) page only. */
(function () {
  if (window.__ppExploreIntro) return;
  window.__ppExploreIntro = true;

  var SERIF = "'Spectral',Georgia,serif";
  var SANS = "'Hanken Grotesk',system-ui,sans-serif";

  var navigating = false;
  function go(href) {
    if (navigating) return; // bug 3: block double-navigation / double transition
    navigating = true;
    if (window.__ppTrans && window.__ppTrans.go) window.__ppTrans.go(href);
    else location.href = href;
  }

  function openSignin() {
    if (window.__ppAuth && window.__ppAuth.openAccount) { window.__ppAuth.openAccount(); }
    else if (window.__ppAuth && window.__ppAuth.showWelcome) { window.__ppAuth.showWelcome(); }
    else if (typeof toast === 'function') { toast('Sign-in is available on the published site.'); }
  }

  // tiles: act 'map' = reveal map in-place · 'near' = reveal + locate ·
  // 'passport' = passport overlay · otherwise navigate to href.
  var TILES = [
    { k: 'explore', big: 1, ic: '🗺️', h: 'Explore the map', p: "All 63 parks, each pin coloured by today's go / no-go call.", act: 'map' },
    { k: 'status', ic: '🌤️', h: 'Live park status', p: 'Weather, alerts & the verdict for any park.', act: 'map' },
    { k: 'near', ic: '📍', h: 'Parks near me', p: 'Find the best parks around you, right now.', act: 'near' },
    { k: 'build', ic: '🧭', h: 'Build a trip', p: 'Real-road routes, dates & costs.', href: '/build-trip' },
    { k: 'plan', ic: '📋', h: 'Plan a trip', p: "Not sure where? Answer a few questions.", href: '/plan' },
    { k: 'passport', ic: '🛂', h: 'Trip passport', p: 'Collect a stamp for every park you visit.', act: 'passport' },
    { k: 'about', ic: '📖', h: 'About', p: 'Everything ParkBuddy does, in one place.', act: 'about', href: '/about' }
  ];

  function styles() {
    if (document.getElementById('ex-bento-kf')) return;
    var s = document.createElement('style');
    s.id = 'ex-bento-kf';
    s.textContent =
      "@keyframes exb-sun{0%,100%{transform:scale(1);opacity:.9}50%{transform:scale(1.06);opacity:1}}" +
      "@keyframes exb-drift{from{transform:translateX(-20vw)}to{transform:translateX(120vw)}}" +
      "@keyframes exb-rise{from{transform:translateY(20px)}to{transform:translateY(0)}}" +
      "@keyframes exb-pulse{0%{box-shadow:0 0 0 0 rgba(70,217,127,.5)}70%{box-shadow:0 0 0 8px rgba(70,217,127,0)}100%{box-shadow:0 0 0 0 rgba(70,217,127,0)}}" +
      "@keyframes exb-shim{0%,55%{transform:translateX(-130%)}80%,100%{transform:translateX(130%)}}" +
      "#ex-bento .exb-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;max-width:920px;width:100%;margin:30px auto 0}" +
      "#ex-bento .exb-tile{grid-column:span 1}" +
      "#ex-bento .exb-tile.big{grid-column:span 2;grid-row:span 2}" +
      "#ex-bento .exb-tile{position:relative;overflow:hidden;text-align:left;cursor:pointer;border:1px solid rgba(255,255,255,.5);" +
        "background:rgba(251,246,234,.9);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-radius:20px;padding:17px 18px;" +
        "display:flex;flex-direction:column;justify-content:space-between;min-height:104px;color:#15241c;font-family:" + SANS + ";" +
        "box-shadow:0 16px 40px rgba(8,16,12,.32);transition:transform .3s cubic-bezier(.2,.8,.3,1),box-shadow .3s;animation:exb-rise .6s ease both}" +
      "#ex-bento .exb-tile:hover{transform:translateY(-6px);box-shadow:0 28px 60px rgba(8,16,12,.46)}" +
      "#ex-bento .exb-tile .exb-ic{font-size:1.5rem;line-height:1}" +
      "#ex-bento .exb-tile.big .exb-ic{font-size:2rem}" +
      "#ex-bento .exb-tile h3{font-family:" + SERIF + ";font-weight:700;font-size:1.12rem;color:#163a2b;letter-spacing:-.01em;margin-top:10px}" +
      "#ex-bento .exb-tile.big h3{font-size:1.7rem}" +
      "#ex-bento .exb-tile p{font-size:.78rem;color:#5e6557;line-height:1.4;margin-top:3px;font-weight:500}" +
      "#ex-bento .exb-tile.big p{font-size:.92rem;max-width:32ch}" +
      "#ex-bento .exb-tile .exb-go{position:absolute;top:15px;right:16px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(22,58,43,.08);color:#163a2b;font-size:14px;transition:transform .3s,background .3s}" +
      "#ex-bento .exb-tile:hover .exb-go{transform:translate(2px,-2px);background:#1d4a37;color:#fff}" +
      "#ex-bento .exb-tile.big{background:linear-gradient(150deg,#1d4a37,#0f2c20 70%);border:1px solid rgba(228,190,120,.32);color:#fbf6ea}" +
      "#ex-bento .exb-tile.big h3{color:#fbf6ea}#ex-bento .exb-tile.big p{color:rgba(251,246,234,.8)}" +
      "#ex-bento .exb-tile.big .exb-go{background:rgba(228,190,120,.2);color:#e4be78}" +
      "#ex-bento .exb-tile.big:hover .exb-go{background:#e4be78;color:#15241c}" +
      "#ex-bento .exb-shim{position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 32%,rgba(228,190,120,.16) 48%,transparent 64%);transform:translateX(-130%);animation:exb-shim 6s ease-in-out infinite}" +
      "#ex-home{position:fixed;left:16px;bottom:64px;top:auto;transform:none;z-index:8500;display:none;align-items:center;gap:8px;background:rgba(16,32,23,.5);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(228,190,120,.5);color:#fbf6ea;border-radius:999px;padding:8px 16px 8px 10px;font-family:" + SANS + ";font-weight:800;font-size:.82rem;cursor:pointer;box-shadow:0 12px 30px -12px rgba(0,0,0,.6)}" +
      "#ex-home .hm{width:26px;height:26px;border-radius:8px;background:linear-gradient(145deg,#e4be78,#c79a4b);display:flex;align-items:center;justify-content:center}" +
      "#ex-bento .exb-flip{perspective:1000px;background:none!important;border:none!important;box-shadow:none!important;padding:0!important;overflow:visible}" +
      "#ex-bento .exb-flip:hover{transform:none}" +
      "#ex-bento .exb-flip-inner{position:relative;width:100%;min-height:104px;height:100%;transition:transform .6s cubic-bezier(.4,.2,.2,1);transform-style:preserve-3d}" +
      "#ex-bento .exb-flip.flipped .exb-flip-inner{transform:rotateY(180deg)}" +
      "#ex-bento .exb-face{position:absolute;inset:0;-webkit-backface-visibility:hidden;backface-visibility:hidden;border:1px solid rgba(255,255,255,.5);background:rgba(251,246,234,.92);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);border-radius:20px;padding:16px 17px;display:flex;flex-direction:column;justify-content:space-between;color:#15241c;box-shadow:0 16px 40px rgba(8,16,12,.32)}" +
      "#ex-bento .exb-front .exb-ic{font-size:1.5rem}#ex-bento .exb-front h3{font-family:" + SERIF + ";font-weight:700;font-size:1.12rem;color:#163a2b;margin-top:10px}#ex-bento .exb-front p{font-size:.78rem;color:#5e6557;line-height:1.4;margin-top:3px;font-weight:500}#ex-bento .exb-front .exb-go{position:absolute;top:15px;right:16px;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(22,58,43,.08);color:#163a2b;font-size:14px}" +
      "#ex-bento .exb-back{transform:rotateY(180deg);background:linear-gradient(150deg,#1d4a37,#0f2c20);border-color:rgba(228,190,120,.32);color:#fbf6ea;justify-content:center;gap:8px}" +
      "#ex-bento .exb-back .bl{font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#e4be78}" +
      "#ex-bento .exb-opt{display:flex;align-items:center;gap:8px;width:100%;text-align:left;background:rgba(251,246,234,.1);border:1px solid rgba(255,255,255,.22);color:#fbf6ea;border-radius:11px;padding:9px 11px;font-family:" + SANS + ";font-weight:700;font-size:.84rem;cursor:pointer;transition:background .15s}" +
      "#ex-bento .exb-opt:hover{background:rgba(251,246,234,.2)}" +
      "#ex-bento .exb-unflip{position:absolute;top:9px;right:12px;background:none;border:none;color:rgba(251,246,234,.7);font-size:1rem;cursor:pointer;line-height:1}" +
      "#ex-parklist{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,18,12,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}" +
      "#ex-parklist .pl-card{background:#fbf6ea;border-radius:22px;width:100%;max-width:460px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 90px -30px rgba(0,0,0,.7)}" +
      "#ex-parklist .pl-head{background:linear-gradient(135deg,#1d4a37,#0f2c20);color:#fbf6ea;padding:15px 18px}" +
      "#ex-parklist .pl-head h3{font-family:" + SERIF + ";font-weight:700;font-size:1.18rem}" +
      "#ex-parklist .pl-x{background:rgba(255,255,255,.16);border:none;color:#fbf6ea;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:.95rem;flex:none}" +
      "#ex-parklist .pl-search{margin:13px 16px 6px;padding:11px 13px;border:1.5px solid #e7ddca;border-radius:12px;font-family:" + SANS + ";font-size:.9rem;outline:none;color:#1a2b21}" +
      "#ex-parklist .pl-search:focus{border-color:#c79a4b;box-shadow:0 0 0 3px rgba(199,154,75,.18)}" +
      "#ex-parklist .pl-list{overflow-y:auto;padding:4px 8px 12px}" +
      "#ex-parklist .pl-row{display:flex;justify-content:space-between;align-items:center;padding:11px 12px;border-radius:12px;cursor:pointer}" +
      "#ex-parklist .pl-row:hover{background:#f1ead9}" +
      "#ex-about{position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,18,12,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}" +
      "#ex-about .ab-card{background:#fbf6ea;border-radius:24px;width:100%;max-width:640px;max-height:88vh;overflow-y:auto;box-shadow:0 40px 90px -30px rgba(0,0,0,.7);animation:exb-rise .5s ease both}" +
      "#ex-about .ab-head{background:linear-gradient(150deg,#1d4a37,#0f2c20);color:#fbf6ea;padding:24px 24px 22px;position:relative}" +
      "#ex-about .ab-x{position:absolute;top:15px;right:15px;background:rgba(255,255,255,.16);border:none;color:#fbf6ea;width:32px;height:32px;border-radius:9px;cursor:pointer;font-size:1rem}" +
      "#ex-about .ab-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:20px 22px}" +
      "#ex-about .ab-item{background:#fffdf7;border:1px solid #e7ddca;border-radius:15px;padding:14px 15px}" +
      "#ex-about .ab-item .ai{font-size:1.4rem;line-height:1}" +
      "#ex-about .ab-item h4{font-family:" + SERIF + ";font-weight:700;font-size:1rem;color:#163a2b;margin-top:8px}" +
      "#ex-about .ab-item p{font-size:.8rem;color:#5e6557;line-height:1.45;margin-top:3px}" +
      "#ex-about .ab-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:2px 24px 22px}" +
      "#ex-bento #ex-signin{position:absolute;top:16px;right:16px;z-index:5;display:inline-flex;align-items:center;gap:7px;background:rgba(251,246,234,.12);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.28);color:#fbf6ea;border-radius:999px;padding:8px 15px;font-family:" + SANS + ";font-weight:800;font-size:.8rem;cursor:pointer;transition:background .15s}" +
      "#ex-bento #ex-signin:hover{background:rgba(251,246,234,.22)}" +
      "#ex-bento #ex-signin .si-av{width:20px;height:20px;border-radius:50%;background:linear-gradient(145deg,#e4be78,#c79a4b);display:flex;align-items:center;justify-content:center;color:#15241c;font-size:.7rem;font-weight:900}" +
      "@media(max-width:560px){#ex-about .ab-grid{grid-template-columns:1fr}}" +
      "@media(max-width:760px){#ex-bento{padding:30px 16px}#ex-bento .exb-grid{grid-template-columns:repeat(2,1fr)}#ex-bento .exb-tile.big{grid-column:span 2;grid-row:span 1;min-height:120px}#ex-bento .exb-tile{min-height:96px;padding:14px 15px}#ex-bento .exb-tile h3{font-size:1rem}#ex-bento .exb-tile.big h3{font-size:1.3rem}#ex-bento .exb-tile p{font-size:.74rem}}" +
      "@media(max-width:430px){#ex-bento .exb-grid{grid-template-columns:1fr}#ex-bento .exb-tile.big{grid-column:span 1}#ex-bento .exb-flip-inner{min-height:96px}}" +
      "@media(max-width:760px){#ex-bento .exb-grid{grid-template-columns:repeat(2,1fr)}#ex-bento .exb-tile.big{grid-column:span 2;grid-row:span 1}}" +
      "@media(prefers-reduced-motion:reduce){#ex-bento *{animation:none!important}}";
    document.head.appendChild(s);
  }

  function homeBtn() {
    var b = document.getElementById('ex-home');
    if (b) return b;
    b = document.createElement('button');
    b.id = 'ex-home';
    b.innerHTML = '<span class="hm"><svg width="15" height="15" viewBox="0 0 24 24" fill="#15241c"><path d="M12 2l5 9h-3l5 9H5l5-9H7z"></path><rect x="11" y="18" width="2" height="4"></rect></svg></span>Home';
    b.addEventListener('click', showCover);
    (document.body || document.documentElement).appendChild(b);
    return b;
  }

  // bug 1: map-page chrome (planner FAB/panel sit above the cover at z-9998) must
  // not float over the bento landing — hide it while the cover is up.
  function setMapChrome(show) {
    ['ppb-fab', 'ppb-panel'].forEach(function (id) {
      var e = document.getElementById(id);
      if (e) e.style.visibility = show ? '' : 'hidden';
    });
  }

  var ov = null;
  function showCover() {
    if (!ov) return;
    ov.style.transform = 'translateY(0)';
    ov.style.opacity = '1';
    ov.style.pointerEvents = 'auto';
    ov.querySelectorAll('.exb-flip.flipped').forEach(function (f) { f.classList.remove('flipped'); });
    var hb = document.getElementById('ex-home'); if (hb) hb.style.display = 'none';
    setMapChrome(false);
  }
  function hideCover() {
    if (!ov) return;
    ov.style.transform = 'translateY(-104%)';
    ov.style.opacity = '0';
    ov.style.pointerEvents = 'none';
    var hb = homeBtn(); hb.style.display = 'flex';
    setMapChrome(true);
  }

  function act(t) {
    if (t.act === 'map') { hideCover(); }
    else if (t.act === 'near') { hideCover(); if (typeof window.flyToMe === 'function') setTimeout(window.flyToMe, 350); }
    else if (t.act === 'passport') { if (window.__ppPassport && window.__ppPassport.open) window.__ppPassport.open(); else if (typeof toast === 'function') toast('Passport loads in a moment…'); }
    else if (t.act === 'about') { openAbout(); }
    else if (t.href) { go(t.href); }
  }

  function openAbout() {
    if (document.getElementById('ex-about')) return;
    var ITEMS = [
      { ic: '🌤️', h: 'Live conditions', p: 'Real-time weather, alerts & closures for every park.' },
      { ic: '✓', h: 'Go / no-go call', p: 'One honest verdict so you know if it\u2019s a good day.' },
      { ic: '🗺️', h: 'Explore the map', p: 'All 63 parks, each pin coloured by today\u2019s call.' },
      { ic: '📋', h: 'Plan a trip', p: 'Answer a few questions, get a personalised route.' },
      { ic: '🧭', h: 'Build a trip', p: 'Real-road routes with dates & a cost estimate.' },
      { ic: '🛂', h: 'Trip passport', p: 'Collect a stamp for every park you explore.' }
    ];
    var m = document.createElement('div');
    m.id = 'ex-about';
    m.innerHTML = '<div class="ab-card">' +
      '<div class="ab-head"><button class="ab-x" aria-label="Close">\u2715</button>' +
        '<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(20,36,28,.4);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:6px 13px;font-family:' + SANS + ';font-size:.64rem;font-weight:800;letter-spacing:.1em;color:#e4be78;margin-bottom:13px">WHY PARKBUDDY</div>' +
        '<h2 style="font-family:' + SERIF + ';font-weight:800;font-size:clamp(1.5rem,4vw,2.1rem);line-height:1.05;letter-spacing:-.01em;margin:0">One place to decide,<br>plan &amp; go.</h2>' +
        '<p style="font-family:' + SANS + ';font-size:.92rem;line-height:1.55;color:rgba(251,246,234,.85);margin-top:11px;max-width:52ch">ParkBuddy reads live conditions at every U.S. national park and gives you one honest go / no-go call \u2014 then helps you plan the whole trip around it.</p>' +
      '</div>' +
      '<div class="ab-grid">' + ITEMS.map(function (it) { return '<div class="ab-item"><div class="ai">' + it.ic + '</div><h4>' + it.h + '</h4><p>' + it.p + '</p></div>'; }).join('') + '</div>' +
      '<div class="ab-foot"><span style="display:inline-flex;align-items:center;gap:8px;font-family:' + SANS + ';font-weight:800;color:#1d4a37;font-size:.9rem"><span style="width:9px;height:9px;border-radius:50%;background:#46c46a"></span>Free for travelers, always.</span>' +
        '<a class="ab-full" href="/about" style="font-family:' + SANS + ';font-weight:800;color:#b07d3a;text-decoration:none;font-size:.86rem">Read the full story \u2192</a></div>' +
    '</div>';
    (document.body || document.documentElement).appendChild(m);
    function close() { if (m.parentNode) m.parentNode.removeChild(m); }
    m.querySelector('.ab-x').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    var full = m.querySelector('.ab-full');
    if (full) full.addEventListener('click', function (e) { e.preventDefault(); go('/about'); });
  }

  function allParks() {
    try { if (typeof PARKS !== 'undefined' && PARKS && PARKS.length) return PARKS; } catch (e) {}
    return window.PARKS || window.TRIP_PARKS || [];
  }
  function openParkList() {
    if (document.getElementById('ex-parklist')) return;
    var parks = allParks().slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    function rowsHtml(q) {
      q = (q || '').toLowerCase();
      var html = parks.filter(function (p) { return !q || (p.name + ' ' + p.state).toLowerCase().indexOf(q) > -1; }).map(function (p) {
        var V = window._verdictById && window._verdictById[p.id];
        var col = V ? V.c : '#cdbf9f';
        var dot = '<span style="width:10px;height:10px;border-radius:50%;background:' + col + ';border:1.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.08);flex:none"></span>';
        return '<div class="pl-row" data-id="' + p.id + '"><b style="font-family:' + SERIF + ';font-weight:700;font-size:.98rem;color:#163a2b">' + p.name + '</b><div style="display:flex;align-items:center;gap:9px"><span style="font-size:.74rem;color:#8c8473;font-weight:600">' + p.state + '</span>' + dot + '</div></div>';
      }).join('');
      return html || '<div style="padding:22px;text-align:center;color:#8c8473;font-size:.86rem">No parks match that search.</div>';
    }
    var modal = document.createElement('div');
    modal.id = 'ex-parklist';
    modal.innerHTML = '<div class="pl-card">' +
      '<div class="pl-head"><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3>Pick a park</h3><button class="pl-x" aria-label="Close">\u2715</button></div>' +
        '<p style="font-size:.78rem;color:rgba(251,246,234,.75);margin-top:3px">See its live conditions &amp; go / no-go call</p></div>' +
      '<input class="pl-search" placeholder="Search parks or states\u2026" autocomplete="off">' +
      '<div class="pl-list">' + rowsHtml('') + '</div>' +
    '</div>';
    (document.body || document.documentElement).appendChild(modal);
    var listEl = modal.querySelector('.pl-list');
    var search = modal.querySelector('.pl-search');
    function bind() { listEl.querySelectorAll('.pl-row').forEach(function (r) { r.addEventListener('click', function () { go('/park-status?park=' + r.getAttribute('data-id')); }); }); }
    bind();
    search.addEventListener('input', function () { listEl.innerHTML = rowsHtml(search.value); bind(); });
    function close() { if (modal.parentNode) modal.parentNode.removeChild(modal); }
    modal.querySelector('.pl-x').addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    setTimeout(function () { try { search.focus(); } catch (e) {} }, 60);
  }

  function inject() {
    if (document.getElementById('ex-bento')) return;
    styles();

    ov = document.createElement('div');
    ov.id = 'ex-bento';
    ov.style.cssText = "position:fixed;inset:0;z-index:9000;overflow-y:auto;color:#fbf6ea;background:#0f2c20;" +
      "display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;" +
      "transition:transform 1s cubic-bezier(.76,0,.24,1),opacity .55s ease .3s;will-change:transform";

    var tilesHtml = TILES.map(function (t) {
      if (t.k === 'status') {
        return '<div class="exb-tile exb-flip" data-k="status">' +
          '<div class="exb-flip-inner">' +
            '<div class="exb-face exb-back">' +
              '<button class="exb-unflip" title="Back">\u21A9</button>' +
              '<div class="bl">Find a park by\u2026</div>' +
              '<button class="exb-opt" data-sub="map">\uD83D\uDDFA\uFE0F On the map</button>' +
              '<button class="exb-opt" data-sub="list">\uD83D\uDCCB Pick from a list</button>' +
            '</div>' +
            '<div class="exb-face exb-front">' +
              '<div class="exb-ic">' + t.ic + '</div>' +
              '<div><h3>' + t.h + '</h3><p>' + t.p + '</p></div>' +
              '<span class="exb-go">\u2192</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }
      return '<button class="exb-tile ' + (t.big ? 'big' : '') + '" data-k="' + t.k + '">' +
        (t.big ? '<div class="exb-shim"></div>' : '') +
        '<div class="exb-ic">' + t.ic + '</div>' +
        '<div><h3>' + t.h + '</h3><p>' + t.p + '</p></div>' +
        '<span class="exb-go">\u2192</span>' +
      '</button>';
    }).join('');

    ov.innerHTML =
      '<button id="ex-signin"><span class="si-av">\u25CF</span>Sign in</button>' +
      // living scene
      '<div style="position:absolute;inset:0;z-index:0;background:linear-gradient(172deg,#0e2417 0%,#163a2b 26%,#1d4a37 48%,#2c6258 70%,#6f9a78 100%)"></div>' +
      '<div style="position:absolute;z-index:0;top:-6%;right:9%;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(255,238,190,.9),rgba(228,190,120,.4) 40%,transparent 70%);filter:blur(4px);animation:exb-sun 6s ease-in-out infinite"></div>' +
      '<div style="position:absolute;z-index:0;top:15%;width:230px;height:62px;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(255,253,247,.4),transparent 72%);filter:blur(8px);animation:exb-drift 56s linear infinite"></div>' +
      '<div style="position:absolute;z-index:0;left:-5%;right:-5%;bottom:0;height:40%;background:linear-gradient(180deg,#173f30,#123022);opacity:.85;clip-path:polygon(0 72%,14% 54%,30% 68%,46% 44%,62% 64%,80% 46%,100% 62%,100% 100%,0 100%)"></div>' +
      '<div style="position:absolute;z-index:0;left:-5%;right:-5%;bottom:0;height:28%;background:linear-gradient(180deg,#0f2c20,#0a2016);clip-path:polygon(0 78%,12% 62%,28% 76%,44% 56%,60% 74%,78% 58%,100% 72%,100% 100%,0 100%)"></div>' +
      '<div style="position:absolute;z-index:0;inset:0;background:radial-gradient(120% 80% at 50% 12%,transparent 44%,rgba(8,18,12,.5) 100%)"></div>' +
      // content
      '<div style="position:relative;z-index:2;width:100%;max-width:920px;margin:auto">' +
        '<div style="display:inline-flex;align-items:center;gap:9px;background:rgba(20,36,28,.42);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:7px 15px;font-family:' + SANS + ';font-size:.72rem;font-weight:800;letter-spacing:.08em;margin-bottom:16px;animation:exb-rise .6s ease both">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:#46d97f;box-shadow:0 0 0 4px rgba(70,217,127,.22);animation:exb-pulse 2s infinite"></span>PARKBUDDY · LIVE NATIONAL-PARK CONDITIONS</div>' +
        '<h1 style="font-family:' + SERIF + ';font-weight:800;font-size:clamp(2.1rem,5.2vw,3.7rem);line-height:1;letter-spacing:-.02em;margin:0;text-shadow:0 4px 30px rgba(0,0,0,.4);animation:exb-rise .7s ease .05s both">See if today\u2019s a <em style="font-style:italic;color:#e4be78">good day</em> to go.</h1>' +
        '<p style="font-family:' + SANS + ';font-size:clamp(.95rem,1.5vw,1.12rem);margin:15px auto 0;max-width:52ch;color:rgba(251,246,234,.86);line-height:1.55;text-shadow:0 2px 14px rgba(0,0,0,.4);animation:exb-rise .8s ease .1s both">Pick where you want to go \u2014 the map, a park\u2019s live status, or a whole trip.</p>' +
        '<div class="exb-grid">' + tilesHtml + '</div>' +
        '<div id="exb-hint" style="font-family:' + SANS + ';font-size:.72rem;color:rgba(251,246,234,.62);margin-top:20px;letter-spacing:.03em">Reading the live map\u2026</div>' +
      '</div>';

    (document.body || document.documentElement).appendChild(ov);
    homeBtn();
    var pre = document.getElementById('ex-preload'); if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
    setMapChrome(false); // cover is up on first paint — keep map chrome hidden (bug 1)

    // bug 4: /explore is the live map itself (reached from the Build page's "Map" tab),
    // so open straight onto the map instead of the bento landing.
    var path = (location.pathname || '').replace(/\/+$/, '');
    var directMap = /\bview=map\b/.test(location.search || '') || /\/explore$/.test(path);
    if (directMap) { ov.style.transition = 'none'; hideCover(); requestAnimationFrame(function () { ov.style.transition = ''; }); }

    var si = ov.querySelector('#ex-signin');
    if (si) si.addEventListener('click', function (e) { e.stopPropagation(); openSignin(); });

    ov.querySelectorAll('.exb-tile').forEach(function (el, idx) {
      el.style.animationDelay = (0.25 + idx * 0.06) + 's';
      if (el.classList.contains('exb-flip')) {
        var front = el.querySelector('.exb-front');
        if (front) front.addEventListener('click', function (e) { e.stopPropagation(); el.classList.add('flipped'); });
        var unflip = el.querySelector('.exb-unflip');
        if (unflip) unflip.addEventListener('click', function (e) { e.stopPropagation(); el.classList.remove('flipped'); });
        el.querySelectorAll('.exb-opt').forEach(function (b) {
          b.addEventListener('click', function (e) {
            e.stopPropagation();
            if (b.getAttribute('data-sub') === 'map') { el.classList.remove('flipped'); hideCover(); }
            else { openParkList(); }
          });
        });
        return;
      }
      el.addEventListener('click', function () {
        var t = TILES.find(function (x) { return x.k === el.getAttribute('data-k'); });
        if (t) act(t);
      });
    });

    // live conditions counter
    var hint = ov.querySelector('#exb-hint');
    var iv = setInterval(function () {
      if (!document.getElementById('ex-bento')) { clearInterval(iv); return; }
      var n = window._verdictById ? Object.keys(window._verdictById).length : 0;
      if (hint && n > 0) hint.textContent = "Today\u2019s conditions in for " + n + " parks";
    }, 400);
  }

  if (document.body) inject();
  else document.addEventListener('DOMContentLoaded', inject);
})();
