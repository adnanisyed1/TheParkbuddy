/* ParkBuddy — Pack & Go (Step 6 of the trip flow).
   The checklist is GENERATED from the real trip: it reads window.trip (stops,
   season, travelers, camp vs lodge, per-park conditions) and drafts a
   park-specific, conditions-aware checklist you accept with one tap. Plus an AI
   "describe your trip" bar, starter templates, manual add/edit/reorder, and
   persistence alongside the itinerary. Categorised by when & where it happens. */
(function () {
  if (window.__pbChecklist) return;
  window.__pbChecklist = true;

  var KEY = 'pb_checklist_v1';
  var CATS = [
    { id: 'pack', t: 'Pack before you leave', ic: '\uD83C\uDF92', sub: 'In the bag at home' },
    { id: 'grab', t: 'Grab on the way', ic: '\uD83D\uDED2', sub: 'Stops & supply runs' },
    { id: 'do', t: 'Do at the destination', ic: '\uD83D\uDCCD', sub: 'Must-dos & treats' }
  ];
  var TPL = {
    babies: { label: '\uD83C\uDF7C Babies & toddlers', items: [['pack', 'Diapers & wipes'], ['pack', 'Formula / baby food'], ['pack', 'Carrier or kid backpack'], ['pack', 'Change of clothes'], ['grab', 'Fresh milk / water'], ['do', 'Find a stroller-friendly trail']] },
    cookout: { label: '\uD83C\uDF56 Cookout / BBQ', items: [['pack', 'Grill grate & utensils'], ['pack', 'Foil & trash bags'], ['grab', 'Charcoal / propane'], ['grab', 'Lighter & matches'], ['grab', 'Ice, drinks & food']] },
    hiking: { label: '\uD83E\uDD7E Hiking day', items: [['pack', 'Day pack'], ['pack', 'First-aid kit'], ['pack', 'Trail map (offline)'], ['grab', 'Water & trail snacks'], ['do', 'Sunrise summit photo']] }
  };

  // Park-specific knowledge (matched on the stop name). Keeps Phase-1 "go deep on
  // famous first-timer parks" honest — these are the things people actually forget.
  var PARK_TIPS = {
    zion: { pack: ['Water shoes for the Narrows', 'Quick-dry layers'], grab: ['Extra water — desert heat'], do: ['Reserve an Angels Landing permit', 'Ride the canyon shuttle (no cars)'] },
    yosemite: { pack: ['Bear canister for food', 'Layers — valley vs high country'], do: ['Half Dome permit (if hiking)', 'Catch the valley shuttle'] },
    yellowstone: { pack: ['Bear spray', 'Warm layers — weather swings fast'], do: ['Stay 100 yds from wildlife', 'Time an Old Faithful eruption'] },
    teton: { pack: ['Bear spray', 'Binoculars for wildlife'], do: ['Sunrise at Schwabacher Landing'] },
    'grand canyon': { pack: ['1 gal water per person/day', 'Sun hat & high-SPF'], do: ['Watch sunset from the rim', "Don't try rim-to-rim unprepared"] },
    arches: { pack: ['Lots of water', 'Sun protection — no shade'], do: ['Delicate Arch at golden hour'] },
    bryce: { pack: ['Warm layers — 8,000 ft & cold', 'Traction in shoulder season'], do: ['Sunrise at Sunrise Point'] },
    glacier: { pack: ['Bear spray', 'Rain shell'], do: ['Drive Going-to-the-Sun Road early'] },
    rocky: { pack: ['Altitude meds / hydrate', 'Afternoon rain shell'], do: ['Timed-entry reservation', 'Hike early — afternoon storms'] },
    'great smoky': { pack: ['Rain shell — wettest park', 'Bug spray'], do: ['Cades Cove loop at dawn'] },
    'joshua tree': { pack: ['Tons of water', 'Headlamp for stargazing'], do: ['Stay for the dark-sky stars'] },
    acadia: { pack: ['Layers & wind shell'], do: ['Sunrise on Cadillac Mountain (reserve)'] },
    olympic: { pack: ['Rain shell', 'Layers for 3 ecosystems'], do: ['Tide-pool at low tide'] },
    sequoia: { pack: ['Bear canister', 'Layers — elevation swings'], do: ['Stand under General Sherman'] }
  };

  function css() {
    if (document.getElementById('pbck-css')) return;
    var s = document.createElement('style'); s.id = 'pbck-css';
    s.textContent =
      ".pbck{max-width:1320px;margin:0 auto;padding:6px clamp(16px,3vw,28px) 12px;font-family:'Hanken Grotesk',system-ui,sans-serif}" +
      ".pbck-step{display:flex;align-items:center;gap:11px;margin:0 2px 14px}.pbck-step .sn{width:30px;height:30px;flex:none;border-radius:50%;background:linear-gradient(150deg,#33555f,#1d3941);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.9rem;border:2px solid #e4be78}.pbck-step .sl{font-size:.7rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#cdd9c2}.pbck-step .sl b{display:block;font-family:'Spectral',serif;font-weight:700;font-size:1.18rem;letter-spacing:-.01em;text-transform:none;color:#fff;margin-top:1px}" +
      ".pbck-card{background:#fffdf7;border:1px solid #e7ddca;border-radius:22px;padding:clamp(16px,2.4vw,24px);box-shadow:0 22px 50px -30px rgba(28,46,34,.4),0 2px 6px rgba(28,46,34,.05)}" +
      ".pbck-h{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px}" +
      ".pbck-h .ey{font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#c79a4b;margin-bottom:5px}" +
      ".pbck-h h2{font-family:'Spectral',serif;font-weight:800;font-size:clamp(1.5rem,2.6vw,2rem);color:#1d3941;line-height:1.05}.pbck-h h2 em{font-style:italic;color:#2c5562}" +
      ".pbck-h .sub{font-size:.86rem;color:#5b6258;margin-top:5px;max-width:54ch;line-height:1.45}" +
      ".pbck-prog{font-family:'Spectral',serif;font-weight:800;font-size:1.5rem;color:#2c5562;white-space:nowrap}.pbck-prog span{font-size:.8rem;color:#8c8473;font-weight:600;font-family:inherit}" +
      // generator
      ".pbck-gen{background:linear-gradient(150deg,#33555f,#1d3941);border-radius:18px;padding:16px 17px;margin-bottom:16px;color:#fbf6ea;position:relative;overflow:hidden}" +
      ".pbck-gen .gh{display:flex;align-items:center;gap:9px;font-family:'Spectral',serif;font-weight:700;font-size:1.12rem}.pbck-gen .gh .spark{font-size:1.05rem}" +
      ".pbck-gen .gsub{font-size:.82rem;color:rgba(251,246,234,.78);margin-top:3px;line-height:1.4}" +
      ".pbck-genrow{display:flex;flex-wrap:wrap;gap:9px;margin-top:13px}" +
      ".pbck-genbtn{flex:none;display:inline-flex;align-items:center;gap:8px;background:linear-gradient(120deg,#e4be78,#c79a4b);color:#15241c;border:none;font-family:inherit;font-weight:800;font-size:.88rem;padding:11px 17px;border-radius:12px;cursor:pointer;box-shadow:0 4px 0 #9c7330;transition:transform .12s,box-shadow .12s}.pbck-genbtn:active{transform:translateY(2px);box-shadow:0 1px 0 #9c7330}.pbck-genbtn[disabled]{opacity:.6;cursor:default}" +
      ".pbck-ai{flex:1;min-width:220px;display:flex;gap:7px}.pbck-ai input{flex:1;min-width:0;padding:11px 13px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.1);color:#fbf6ea;font-family:inherit;font-size:.86rem;outline:none}.pbck-ai input::placeholder{color:rgba(251,246,234,.55)}.pbck-ai input:focus{border-color:#e4be78;background:rgba(255,255,255,.16)}" +
      ".pbck-ai button{flex:none;border:none;border-radius:12px;background:rgba(251,246,234,.16);color:#fbf6ea;font-family:inherit;font-weight:700;font-size:.84rem;padding:0 15px;cursor:pointer;border:1px solid rgba(255,255,255,.2)}.pbck-ai button:hover{background:rgba(251,246,234,.24)}" +
      // suggestion tray
      ".pbck-tray{margin-bottom:16px;border:1px solid #d8e2d6;background:linear-gradient(180deg,#f3f7f1,#fbf6ea);border-radius:16px;padding:14px 15px;animation:pbckIn .3s ease}" +
      "@keyframes pbckIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}" +
      ".pbck-trh{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:11px}.pbck-trh .tt{font-weight:800;font-size:.92rem;color:#1d4a37}.pbck-trh .tt span{color:#2f7d4f}" +
      ".pbck-trh .ta{display:flex;gap:7px}.pbck-trh button{border:none;font-family:inherit;font-weight:800;font-size:.78rem;padding:8px 13px;border-radius:999px;cursor:pointer}.pbck-addall{background:linear-gradient(120deg,#2f7d4f,#1d4a37);color:#fff}.pbck-dismiss{background:#efe7d6;color:#8a6a4a}" +
      ".pbck-sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(228px,1fr));gap:8px}" +
      ".pbck-sug{display:flex;align-items:flex-start;gap:9px;background:#fff;border:1px solid #e2e9dd;border-radius:11px;padding:9px 10px}" +
      ".pbck-sug .sl2{flex:1;min-width:0}.pbck-sug .lab{font-size:.84rem;font-weight:700;color:#23332a;line-height:1.25}.pbck-sug .why{font-size:.7rem;color:#7c8473;margin-top:2px;line-height:1.25}.pbck-sug .why b{color:#9a6f28;font-weight:700}" +
      ".pbck-sug .cat{display:inline-block;font-size:.6rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#6a7160;margin-top:4px}" +
      ".pbck-sug .acc{flex:none;width:26px;height:26px;border-radius:8px;border:none;background:linear-gradient(135deg,#2f7d4f,#1d4a37);color:#fff;font-size:.9rem;font-weight:800;cursor:pointer}.pbck-sug .dis{flex:none;width:22px;height:26px;border:none;background:none;color:#bcb199;cursor:pointer;font-size:.8rem}.pbck-sug .dis:hover{color:#b06a4a}" +
      ".pbck-sug.gone{opacity:0;transform:scale(.95);transition:.2s;pointer-events:none}" +
      // templates + lists (from Phase 1)
      ".pbck-tpl{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;align-items:center}.pbck-tpl .tl{font-size:.74rem;font-weight:700;color:#8c8473;margin-right:2px}" +
      ".pbck-tpl button{border:1px dashed #d8c9a6;background:#fbf6ea;color:#1d4a37;font-family:inherit;font-weight:700;font-size:.8rem;padding:8px 13px;border-radius:999px;cursor:pointer;transition:.15s}.pbck-tpl button:hover{border-color:#c79a4b;background:#fff}.pbck-tpl .clr{margin-left:auto;color:#9a6a52;border-color:#e7ddca;border-style:solid}" +
      ".pbck-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}" +
      ".pbck-col{background:#fbf7ed;border:1px solid #ece2cd;border-radius:16px;padding:13px;display:flex;flex-direction:column;min-height:120px}" +
      ".pbck-ct{display:flex;align-items:center;gap:8px;margin-bottom:10px}.pbck-ct .ic{width:30px;height:30px;flex:none;border-radius:9px;background:#eef3ec;display:flex;align-items:center;justify-content:center;font-size:.95rem}.pbck-ct b{font-family:'Spectral',serif;font-weight:700;font-size:.98rem;color:#1d3941;line-height:1}.pbck-ct small{display:block;font-size:.66rem;color:#8c8473;font-weight:600;margin-top:2px}.pbck-ct .n{margin-left:auto;font-size:.7rem;font-weight:800;color:#8c8473;background:#fff;border:1px solid #e7ddca;border-radius:999px;padding:3px 9px}" +
      ".pbck-list{display:flex;flex-direction:column;gap:7px;flex:1}" +
      ".pbck-it{display:flex;align-items:flex-start;gap:9px;background:#fff;border:1px solid #e7ddca;border-radius:11px;padding:9px 10px}.pbck-it.done{background:#f3f1e6;border-color:#e7ddca}" +
      ".pbck-ck{flex:none;width:21px;height:21px;margin-top:1px;border-radius:6px;border:2px solid #cdbf9f;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:800;color:transparent;transition:.15s}.pbck-it.done .pbck-ck{background:linear-gradient(135deg,#2f7d4f,#1d4a37);border-color:#1d4a37;color:#fff}" +
      ".pbck-b{flex:1;min-width:0}" +
      ".pbck-lbl{font-size:.88rem;font-weight:600;color:#2c3a30;line-height:1.3;outline:none;border-radius:4px}.pbck-lbl:focus{box-shadow:0 0 0 2px rgba(199,154,75,.4);background:#fffbf0}.pbck-it.done .pbck-lbl{color:#9aa090;text-decoration:line-through}" +
      ".pbck-note{font-size:.74rem;color:#8c8473;line-height:1.3;outline:none;margin-top:2px;border-radius:4px}.pbck-note:empty:before{content:attr(data-ph);color:#bcb199;cursor:text}.pbck-note:focus{box-shadow:0 0 0 2px rgba(199,154,75,.3);background:#fffbf0}" +
      ".pbck-shop{display:inline-flex;align-items:center;gap:4px;font-size:.7rem;font-weight:700;color:#b07d3a;text-decoration:none;margin-top:4px}.pbck-shop:hover{color:#8a5f20;text-decoration:underline}" +
      ".pbck-acts{display:flex;flex-direction:column;gap:1px;flex:none}.pbck-acts button{background:none;border:none;color:#b8ad95;cursor:pointer;font-size:.8rem;line-height:1;padding:2px 3px;border-radius:4px}.pbck-acts button:hover{color:#2c5562;background:#f1ead9}.pbck-acts .x:hover{color:#b06a4a}" +
      ".pbck-add{display:flex;gap:6px;margin-top:9px}.pbck-add input{flex:1;min-width:0;padding:9px 11px;border:1px solid #e1d8c4;border-radius:10px;font-size:.82rem;font-family:inherit;background:#fff;color:#1a2b21;outline:none}.pbck-add input:focus{border-color:#c79a4b;box-shadow:0 0 0 3px rgba(199,154,75,.16)}.pbck-add button{flex:none;width:38px;border:none;border-radius:10px;background:#2c5562;color:#fff;font-size:1.1rem;cursor:pointer;box-shadow:0 3px 0 #16303a}.pbck-add button:active{transform:translateY(2px);box-shadow:0 1px 0 #16303a}" +
      ".pbck-empty{font-size:.78rem;color:#a7a08c;text-align:center;padding:14px 6px;font-style:italic}" +
      ".pbck-foot{margin-top:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:.78rem;color:#7c8473}.pbck-foot b{color:#1d4a37}" +
      ".pbck-mic{flex:none;width:44px;border-radius:12px;background:rgba(251,246,234,.16);border:1px solid rgba(255,255,255,.2);color:#fbf6ea;font-size:1.05rem;cursor:pointer}" +
      ".pbck-mic.rec{background:#d9534f;border-color:#d9534f;animation:pbckRec 1.1s infinite}" +
      "@keyframes pbckRec{0%{box-shadow:0 0 0 0 rgba(217,83,79,.6)}70%{box-shadow:0 0 0 9px rgba(217,83,79,0)}100%{box-shadow:0 0 0 0 rgba(217,83,79,0)}}" +
      ".pbck-start{margin-left:auto;border:none;font-family:inherit;font-weight:800;font-size:.86rem;color:#15241c;background:linear-gradient(120deg,#e4be78,#c79a4b);padding:11px 18px;border-radius:12px;cursor:pointer;box-shadow:0 4px 0 #9c7330}.pbck-start:active{transform:translateY(2px);box-shadow:0 1px 0 #9c7330}" +
      ".pbck-startov{position:fixed;inset:0;z-index:9700;background:linear-gradient(170deg,#16303a,#0e2a1d);overflow-y:auto;animation:pbckIn .25s ease;font-family:'Hanken Grotesk',system-ui,sans-serif}" +
      ".so-wrap{max-width:680px;margin:0 auto;padding:18px 18px 60px;color:#fbf6ea}" +
      ".so-top{display:flex;align-items:center;gap:15px;position:relative;padding:6px 0 14px}" +
      ".so-x{position:absolute;top:0;right:0;width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fbf6ea;font-size:1rem;cursor:pointer}" +
      ".so-ring{position:relative;width:72px;height:72px;flex:none;border-radius:50%;display:flex;align-items:center;justify-content:center}.so-ring:after{content:'';position:absolute;width:56px;height:56px;border-radius:50%;background:#13312a}.so-ring span{position:relative;z-index:1;font-family:'Spectral',serif;font-weight:800;font-size:1.02rem;color:#fbf6ea}" +
      ".so-tt .so-k{font-size:.66rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#e4be78}.so-tt b{font-family:'Spectral',serif;font-weight:800;font-size:1.5rem;display:block;margin-top:2px}" +
      ".so-phases{display:flex;gap:7px;margin:6px 0 14px}.so-ph{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:13px;padding:11px 6px;color:rgba(251,246,234,.7);font-family:inherit;font-weight:700;font-size:.74rem;cursor:pointer}.so-ph .ic{font-size:1.2rem}.so-ph.on{background:rgba(228,190,120,.16);border-color:#e4be78;color:#fbf6ea}.so-ph.done{color:#9fe3a6}" +
      ".so-cond{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 13px;font-size:.8rem;color:rgba(251,246,234,.82);margin-bottom:14px}.so-cond b{color:#e4be78}" +
      ".so-head{display:flex;align-items:center;gap:11px;margin:4px 0 12px}.so-head .ic{width:40px;height:40px;flex:none;border-radius:11px;background:rgba(228,190,120,.16);display:flex;align-items:center;justify-content:center;font-size:1.2rem}.so-head b{font-family:'Spectral',serif;font-weight:700;font-size:1.3rem}.so-head small{display:block;font-size:.78rem;color:rgba(251,246,234,.62);margin-top:1px}" +
      ".so-list{display:flex;flex-direction:column;gap:9px}" +
      ".so-it{display:flex;align-items:flex-start;gap:13px;width:100%;text-align:left;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:15px;color:#fbf6ea;font-family:inherit;cursor:pointer;transition:.15s}.so-it:hover{background:rgba(255,255,255,.1)}" +
      ".so-it .bx{flex:none;width:26px;height:26px;border-radius:8px;border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-size:.9rem;font-weight:800;color:transparent;margin-top:1px}.so-it.done .bx{background:linear-gradient(135deg,#3fae6a,#2f7d4f);border-color:#2f7d4f;color:#fff}" +
      ".so-it .tx{font-size:1rem;font-weight:600;line-height:1.3}.so-it .tx small{display:block;font-size:.76rem;color:rgba(251,246,234,.6);font-weight:500;margin-top:2px}.so-it.done .tx{color:rgba(251,246,234,.5);text-decoration:line-through}" +
      ".so-empty{color:rgba(251,246,234,.5);font-style:italic;padding:18px;text-align:center}" +
      ".so-nav{display:flex;gap:10px;margin-top:18px}.so-nav button{flex:1;border:none;font-family:inherit;font-weight:800;font-size:.9rem;padding:14px;border-radius:13px;cursor:pointer}.so-prev{background:rgba(255,255,255,.1);color:#fbf6ea;border:1px solid rgba(255,255,255,.2)}.so-prev[disabled]{opacity:.4}.so-next{background:linear-gradient(120deg,#e4be78,#c79a4b);color:#15241c}.so-next.done{background:linear-gradient(120deg,#3fae6a,#2f7d4f);color:#fff}" +
      "@media(max-width:860px){.pbck-grid{grid-template-columns:1fr}}";
    document.head.appendChild(s);
  }

  /* ---------- state ---------- */
  var items = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function has(label) { var l = label.toLowerCase().trim(); return items.some(function (x) { return x.label.toLowerCase().trim() === l; }); }

  /* ---------- read the live trip ---------- */
  function season(month) { return [11, 0, 1].indexOf(month) > -1 ? 'winter' : [2, 3, 4].indexOf(month) > -1 ? 'spring' : [5, 6, 7].indexOf(month) > -1 ? 'summer' : 'fall'; }
  function snapshot() {
    var T = window.trip, stops = [], travelers = 2, month = null;
    try { travelers = parseInt((document.getElementById('travelers') || {}).value, 10) || (T && T.travelers) || 2; } catch (e) {}
    var sd = null; try { sd = (document.getElementById('startdate') || {}).value || (T && T.startDate) || ''; } catch (e) {}
    if (sd) { var d = new Date(sd + 'T00:00'); if (!isNaN(d)) month = d.getMonth(); }
    if (T && T.stops && T.stops.length) {
      T.stops.forEach(function (s) {
        if (s.hidden) return;
        var nm = s.pid && window.byId && window.byId[s.pid] ? window.byId[s.pid].name : (s.name || '');
        if (!nm) return;
        stops.push({ name: nm, camp: /camp/i.test(s.kind || '') || /camp/i.test(s.lodge || ''), booked: !!(s.lodge && s.lodge.trim()), park: !!s.pid });
      });
    } else {
      // DOM fallback — read the rendered stop rows
      [].slice.call(document.querySelectorAll('#stoplist .stop:not(.hidden) .si b')).forEach(function (b) {
        if (b.textContent.trim()) stops.push({ name: b.textContent.trim(), camp: false, booked: false, park: true });
      });
    }
    return { stops: stops, travelers: travelers, month: month, season: month == null ? null : season(month) };
  }

  /* ---------- generate suggestions from the snapshot ---------- */
  function generate() {
    var snap = snapshot(), out = [], seen = {};
    function add(cat, label, why, shop) {
      var k = label.toLowerCase().trim();
      if (seen[k] || has(label)) return; seen[k] = 1;
      out.push({ cat: cat, label: label, why: why || '', shop: shop || '' });
    }
    var anyStop = snap.stops.length;
    // essentials
    add('pack', 'Park pass / reservations printout', 'Some parks need timed entry');
    add('pack', 'ID, cards & a little cash', 'For entrance & firewood');
    add('pack', 'Phone + car charger', '');
    add('pack', 'Refillable water bottles', '');
    add('pack', 'First-aid kit', '');
    add('pack', 'Offline maps downloaded', 'Cell service is spotty in parks');
    add('pack', 'Layers — mornings run cold', '');
    add('pack', 'Sunscreen & lip balm', '');
    add('grab', 'Trail snacks & food', '');
    add('grab', 'Ice & cold drinks', '');
    add('do', 'Collect your park stamp at the visitor center', 'Adds to your Trip Passport');
    // season
    if (snap.season === 'winter') { add('pack', 'Insulated jacket & warm hat', 'Winter trip'); add('pack', 'Traction cleats / microspikes', 'Icy trails'); add('grab', 'Hand & toe warmers', ''); }
    else if (snap.season === 'summer') { add('pack', 'Extra water — ~1 gal/person/day', 'Summer heat'); add('pack', 'Sun hoodie (UPF) & wide hat', 'High summer UV'); add('grab', 'Electrolyte mix', ''); add('do', 'Start hikes before sunrise', 'Beat the heat & crowds'); }
    else { add('pack', 'Rain shell', 'Shoulder-season showers'); add('pack', 'Warm + light layers', 'Swingy weather'); }
    // party
    if (snap.travelers >= 4) { add('pack', 'Kid snacks & entertainment', 'Bigger group / family'); add('pack', 'Extra layers for everyone', ''); }
    // per-stop intelligence
    snap.stops.forEach(function (s) {
      var key = s.name.toLowerCase(), tips = null;
      for (var k in PARK_TIPS) { if (key.indexOf(k) > -1) { tips = PARK_TIPS[k]; break; } }
      if (tips) {
        (tips.pack || []).forEach(function (x) { add('pack', x, s.name); });
        (tips.grab || []).forEach(function (x) { add('grab', x, s.name); });
        (tips.do || []).forEach(function (x) { add('do', x, s.name); });
      }
      if (s.camp) { add('pack', 'Tent, stakes & sleeping bag', s.name + ' — camping'); add('pack', 'Headlamp & camp stove', s.name + ' — camping'); add('grab', 'Firewood (buy local)', "Don't move firewood between parks"); }
      if (s.park && !s.booked) { add('do', 'Lock in a place to stay near ' + s.name, 'No lodging set for this stop', 'stay'); }
    });
    if (!anyStop) { add('do', 'Add stops to your trip for tailored picks', 'Build your itinerary above first'); }
    return out;
  }

  /* ---------- AI "describe your trip" ---------- */
  function ruleParse(text) {
    var t = ' ' + text.toLowerCase() + ' ', out = [];
    function a(cat, label, why) { if (!has(label)) out.push({ cat: cat, label: label, why: why || 'From your description' }); }
    if (/(baby|babies|toddler|infant|kids?|children)/.test(t)) { a('pack', 'Diapers / wipes & kid snacks'); a('pack', 'Carrier or kid backpack'); }
    if (/(cookout|bbq|grill|cook|camp meal)/.test(t)) { a('grab', 'Charcoal / propane & lighter'); a('pack', 'Grill grate & utensils'); }
    if (/(camp|tent|sleep)/.test(t)) { a('pack', 'Tent, sleeping bag & pad'); a('pack', 'Headlamp'); }
    if (/(hik|trail|trek|backpack)/.test(t)) { a('pack', 'Day pack & first-aid kit'); a('grab', 'Water & trail snacks'); }
    if (/(dog|pet)/.test(t)) { a('pack', 'Pet leash, food & water bowl'); a('do', 'Check pet rules for each park'); }
    if (/(photo|camera|stargaz|astro)/.test(t)) { a('pack', 'Camera, batteries & headlamp'); a('do', 'Scout a dark-sky spot'); }
    if (/(fish)/.test(t)) { a('pack', 'Fishing gear'); a('do', 'Buy a fishing license'); }
    if (/(rain|wet|storm)/.test(t)) { a('pack', 'Rain shell & dry bags'); }
    if (/(cold|snow|winter|ski)/.test(t)) { a('pack', 'Insulated layers & traction'); }
    if (/(hot|desert|summer|heat)/.test(t)) { a('pack', 'Extra water & sun protection'); }
    if (!out.length) { a('pack', 'Snacks, water & layers'); a('do', 'Note one must-do for the trip'); }
    return out;
  }
  function aiGenerate(text, done) {
    text = (text || '').trim(); if (!text) { done([]); return; }
    if (window.claude && typeof window.claude.complete === 'function') {
      var snap = snapshot();
      var ctx = snap.stops.length ? ' The trip visits: ' + snap.stops.map(function (s) { return s.name; }).join(', ') + '.' : '';
      var prompt = 'You are a national-parks trip packing assistant. A traveler says: "' + text + '".' + ctx +
        ' Return ONLY a JSON array (no prose) of 4-8 checklist items, each {"cat","label","note"} where cat is exactly one of "pack" (pack at home), "grab" (buy on the way), or "do" (at the destination). Keep labels under 6 words.';
      try {
        Promise.resolve(window.claude.complete(prompt)).then(function (resp) {
          var arr = null; try { var m = String(resp).match(/\[[\s\S]*\]/); arr = JSON.parse(m ? m[0] : resp); } catch (e) {}
          if (!arr || !arr.length) { done(ruleParse(text)); return; }
          done(arr.filter(function (x) { return x && x.label; }).map(function (x) {
            var c = (x.cat || 'pack').toLowerCase(); if (['pack', 'grab', 'do'].indexOf(c) < 0) c = 'pack';
            return { cat: c, label: String(x.label).slice(0, 60), why: x.note || 'From your description' };
          }).filter(function (x) { return !has(x.label); }));
        }, function () { done(ruleParse(text)); });
      } catch (e) { done(ruleParse(text)); }
    } else { done(ruleParse(text)); }
  }

  /* ---------- suggestion tray ---------- */
  var pending = [];
  function showTray(list, label) {
    pending = list;
    var tray = document.querySelector('.pbck-tray');
    var sec = document.querySelector('.pbck-card');
    if (!sec) return;
    if (!tray) { tray = document.createElement('div'); tray.className = 'pbck-tray'; sec.querySelector('.pbck-genwrap').appendChild(tray); }
    if (!list.length) { tray.innerHTML = '<div class="pbck-empty" style="padding:6px">Everything\u2019s already on your list \u2014 nice.</div>'; return; }
    var catName = { pack: 'Pack', grab: 'Grab', do: 'Do' };
    tray.innerHTML = '<div class="pbck-trh"><div class="tt">' + (label || 'Suggested for your trip') + ' \u00b7 <span>' + list.length + ' ideas</span></div>' +
      '<div class="ta"><button class="pbck-addall">\u2713 Add all</button><button class="pbck-dismiss">Dismiss</button></div></div>' +
      '<div class="pbck-sgrid">' + list.map(function (s, i) {
        return '<div class="pbck-sug" data-i="' + i + '"><div class="sl2"><div class="lab">' + esc(s.label) + '</div>' +
          (s.why ? '<div class="why"><b>' + esc(s.why) + '</b></div>' : '') +
          '<span class="cat">' + catName[s.cat] + '</span></div>' +
          '<button class="acc" title="Add">+</button><button class="dis" title="Not needed">\u2715</button></div>';
      }).join('') + '</div>';
  }
  function acceptSug(i) {
    var s = pending[i]; if (!s) return;
    items.push({ id: uid(), cat: s.cat, label: s.label, note: s.why || '', shop: s.shop || '', done: false });
    save(); renderLists();
  }

  /* ---------- list rendering ---------- */
  function shopLink(it) {
    if (it.shop === 'stay') return '<a class="pbck-shop" href="/shop.html">\uD83C\uDFE8 See stays near you</a>';
    if (it.shop === 'gear') return '<a class="pbck-shop" href="/shop.html">\uD83D\uDED2 Shop the gear</a>';
    if (it.cat === 'do' && /souvenir|gift|patch|magnet|postcard|sticker|stamp|mug|pin|hot chocolate|fudge|treat/i.test(it.label)) return '<a class="pbck-shop" href="/shop.html">\uD83D\uDECD Find it in our shop</a>';
    return '';
  }
  function itemHtml(it) {
    return '<div class="pbck-it' + (it.done ? ' done' : '') + '" data-id="' + it.id + '">' +
      '<button class="pbck-ck" data-act="toggle" title="Done">\u2713</button>' +
      '<div class="pbck-b"><div class="pbck-lbl" contenteditable="true" spellcheck="false" data-act="label">' + esc(it.label) + '</div>' +
      '<div class="pbck-note" contenteditable="true" spellcheck="false" data-act="note" data-ph="+ add a note">' + esc(it.note || '') + '</div>' +
      shopLink(it) + '</div>' +
      '<div class="pbck-acts"><button data-act="up" title="Move up">\u2191</button><button data-act="down" title="Move down">\u2193</button><button class="x" data-act="del" title="Remove">\u2715</button></div></div>';
  }
  function renderLists() {
    CATS.forEach(function (c) {
      var list = document.querySelector('.pbck-list[data-cat="' + c.id + '"]'); if (!list) return;
      var its = items.filter(function (x) { return x.cat === c.id; });
      list.innerHTML = its.length ? its.map(itemHtml).join('') : '<div class="pbck-empty">Nothing yet \u2014 generate, add a template, or type an item.</div>';
      var cnt = document.querySelector('.pbck-n[data-cat="' + c.id + '"]');
      if (cnt) { var d = its.filter(function (x) { return x.done; }).length; cnt.textContent = its.length ? (d + '/' + its.length) : '0'; }
    });
    var total = items.length, done = items.filter(function (x) { return x.done; }).length;
    var p = document.querySelector('.pbck-prog');
    if (p) p.innerHTML = total ? (done + '<span>/' + total + ' done</span>') : '<span>nothing yet</span>';
  }
  function addItem(cat, label) { label = (label || '').trim(); if (!label) return; items.push({ id: uid(), cat: cat, label: label, note: '', done: false }); save(); renderLists(); }
  function find(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return i; return -1; }
  function move(id, dir) { var i = find(id); if (i < 0) return; var it = items[i]; var sc = items.filter(function (x) { return x.cat === it.cat; }); var sw = sc[sc.indexOf(it) + dir]; if (!sw) return; var a = find(it.id), b = find(sw.id); items[a] = sw; items[b] = it; save(); renderLists(); }
  function addTemplate(key) { var t = TPL[key]; if (!t) return; t.items.forEach(function (p) { if (!has(p[1])) items.push({ id: uid(), cat: p[0], label: p[1], note: '', done: false }); }); save(); renderLists(); }

  /* ---------- build ---------- */
  function build() {
    var anchor = document.querySelector('.builder');
    var host = anchor ? anchor.parentNode : document.querySelector('.sheet');
    if (!host) return false;
    if (document.querySelector('.pbck')) return true;
    css();
    var sec = document.createElement('section');
    sec.className = 'pbck';
    sec.innerHTML =
      '<div class="pbck-step"><span class="sn">6</span><span class="sl">Pack &amp; go<b>Your trip, packed \u2014 nothing forgotten</b></span></div>' +
      '<div class="pbck-card">' +
      '<div class="pbck-h"><div><div class="ey">Trip checklist \u00b7 built from your itinerary</div>' +
      '<h2>One tap and we <em>draft your list</em></h2>' +
      '<div class="sub">We read your stops, dates, party size and each park\u2019s conditions \u2014 then suggest exactly what to pack, grab and do. Edit anything; it saves with your trip.</div></div>' +
      '<div class="pbck-prog"><span>nothing yet</span></div></div>' +
      '<div class="pbck-genwrap"><div class="pbck-gen">' +
        '<div class="gh"><span class="spark">\u2728</span> Generate my checklist</div>' +
        '<div class="gsub">From your live itinerary \u2014 or describe the trip in your own words.</div>' +
        '<div class="pbck-genrow">' +
          '<button class="pbck-genbtn" data-gen="trip">\u2728 Generate from my trip</button>' +
          '<div class="pbck-ai"><button class="pbck-mic" data-gen="mic" title="Speak your trip">\uD83C\uDFA4</button><input id="pbck-ai-in" placeholder="e.g. 3 days camping with toddlers, a cookout one night\u2026" maxlength="160"><button data-gen="ai">Ask</button></div>' +
        '</div>' +
      '</div></div>' +
      '<div class="pbck-tpl"><span class="tl">Quick add:</span>' +
        '<button data-tpl="babies">' + TPL.babies.label + '</button>' +
        '<button data-tpl="cookout">' + TPL.cookout.label + '</button>' +
        '<button data-tpl="hiking">' + TPL.hiking.label + '</button>' +
        '<button class="clr" data-clr="1">Clear all</button></div>' +
      '<div class="pbck-grid">' + CATS.map(function (c) {
        return '<div class="pbck-col"><div class="pbck-ct"><span class="ic">' + c.ic + '</span><div><b>' + c.t + '</b><small>' + c.sub + '</small></div><span class="n pbck-n" data-cat="' + c.id + '">0</span></div>' +
          '<div class="pbck-list" data-cat="' + c.id + '"></div>' +
          '<form class="pbck-add" data-cat="' + c.id + '"><input placeholder="Add an item\u2026" maxlength="80"><button type="submit" title="Add">+</button></form></div>';
      }).join('') + '</div>' +
      '<div class="pbck-foot"><span>\uD83D\uDD12 Saved on this device with your trip. <b>Sign in soon</b> to sync &amp; get reminders as you travel.</span><button class="pbck-start" data-start="1">\u25B6 Start trip mode</button></div>' +
      '</div>';
    if (anchor) host.insertBefore(sec, anchor.nextSibling); else host.appendChild(sec);
    renderLists();
    wire(sec);
    return true;
  }

  function wire(sec) {
    sec.querySelectorAll('.pbck-add').forEach(function (f) { f.addEventListener('submit', function (e) { e.preventDefault(); var i = f.querySelector('input'); addItem(f.getAttribute('data-cat'), i.value); i.value = ''; i.focus(); }); });
    sec.querySelectorAll('[data-tpl]').forEach(function (b) { b.addEventListener('click', function () { addTemplate(b.getAttribute('data-tpl')); }); });
    var clr = sec.querySelector('[data-clr]'); if (clr) clr.addEventListener('click', function () { if (!items.length || confirm('Clear the whole checklist?')) { items = []; save(); renderLists(); } });
    // generate
    var gt = sec.querySelector('[data-gen="trip"]');
    if (gt) gt.addEventListener('click', function () { showTray(generate(), 'Suggested for your trip'); });
    var aiBtn = sec.querySelector('[data-gen="ai"]'), aiIn = sec.querySelector('#pbck-ai-in');
    function runAI() { var v = aiIn.value.trim(); if (!v) return; aiBtn.textContent = '\u2026'; aiBtn.disabled = true; aiGenerate(v, function (list) { aiBtn.textContent = 'Ask'; aiBtn.disabled = false; showTray(list, 'From \u201c' + v + '\u201d'); }); }
    if (aiBtn) aiBtn.addEventListener('click', runAI);
    if (aiIn) aiIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); runAI(); } });
    var mic = sec.querySelector('[data-gen="mic"]');
    if (mic) { if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) mic.style.display = 'none'; else mic.addEventListener('click', function () { startVoice(mic, aiIn, runAI); }); }
    var sb = sec.querySelector('[data-start="1"]'); if (sb) sb.addEventListener('click', openStart);
    // tray actions (delegated)
    sec.addEventListener('click', function (e) {
      var addAll = e.target.closest && e.target.closest('.pbck-addall');
      if (addAll) { pending.slice().forEach(function (_, i) { acceptSug(i); }); var t = sec.querySelector('.pbck-tray'); if (t) t.remove(); pending = []; return; }
      var dis = e.target.closest && e.target.closest('.pbck-dismiss');
      if (dis) { var tr = sec.querySelector('.pbck-tray'); if (tr) tr.remove(); pending = []; return; }
      var sug = e.target.closest && e.target.closest('.pbck-sug'); if (sug) {
        var i = +sug.getAttribute('data-i');
        if (e.target.closest('.acc')) { acceptSug(i); pending[i] = { _done: 1 }; sug.classList.add('gone'); setTimeout(function () { sug.remove(); }, 200); }
        else if (e.target.closest('.dis')) { pending[i] = { _done: 1 }; sug.classList.add('gone'); setTimeout(function () { sug.remove(); }, 200); }
        return;
      }
      var btn = e.target.closest && e.target.closest('.pbck-it [data-act]'); if (!btn) return;
      var act = btn.getAttribute('data-act'); var row = btn.closest('.pbck-it'); if (!row) return; var id = row.getAttribute('data-id'); var idx = find(id); if (idx < 0) return;
      if (act === 'toggle') { items[idx].done = !items[idx].done; save(); renderLists(); }
      else if (act === 'del') { items.splice(idx, 1); save(); renderLists(); }
      else if (act === 'up') move(id, -1);
      else if (act === 'down') move(id, 1);
    });
    sec.addEventListener('blur', function (e) {
      var el = e.target; if (!el.getAttribute) return; var act = el.getAttribute('data-act'); if (act !== 'label' && act !== 'note') return;
      var row = el.closest('.pbck-it'); if (!row) return; var idx = find(row.getAttribute('data-id')); if (idx < 0) return;
      var val = el.textContent.trim();
      if (act === 'label') { if (!val) items.splice(idx, 1); else items[idx].label = val; } else items[idx].note = val;
      save(); renderLists();
    }, true);
    sec.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-act') === 'label') { e.preventDefault(); e.target.blur(); } });
  }

  /* ---------- voice capture (Web Speech API → transcript → Claude parse) ---------- */
  var reclive = false, rec = null;
  function startVoice(btn, input, after) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return;
    if (reclive) { try { rec.stop(); } catch (e) {} return; }
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    var finalT = ''; reclive = true; btn.classList.add('rec'); var ph0 = input.placeholder; input.placeholder = 'Listening\u2026 speak now';
    function fin() { reclive = false; btn.classList.remove('rec'); input.placeholder = ph0; }
    rec.onresult = function (e) { var t = ''; for (var i = 0; i < e.results.length; i++) { t += e.results[i][0].transcript; if (e.results[i].isFinal) finalT += e.results[i][0].transcript; } input.value = t; };
    rec.onerror = function () { fin(); };
    rec.onend = function () { fin(); var v = (finalT || input.value).trim(); if (v) { input.value = v; after && after(); } };
    try { rec.start(); } catch (e) { fin(); }
  }

  /* ---------- Start trip mode — guided, phase-by-phase walk-through ---------- */
  function tripName() { try { return (document.getElementById('tripname') || {}).value || (window.trip && window.trip.name) || ''; } catch (e) { return ''; } }
  function openStart() {
    if (document.querySelector('.pbck-startov')) return;
    var phases = [{ cat: 'pack', t: 'Before you leave', ic: '\uD83C\uDF92', sub: 'Pack it at home' }, { cat: 'grab', t: 'On the road', ic: '\uD83D\uDED2', sub: 'Grab these en route' }, { cat: 'do', t: 'At the parks', ic: '\uD83D\uDCCD', sub: 'Do it there' }];
    var ph = 0, ov = document.createElement('div'); ov.className = 'pbck-startov'; document.body.appendChild(ov);
    function pct() { var t = items.length, d = items.filter(function (x) { return x.done; }).length; return t ? Math.round(d / t * 100) : 0; }
    function condStrip() { var s = snapshot(); if (!s.stops.length) return ''; return '<div class="so-cond">\uD83D\uDDFA This trip: <b>' + s.stops.map(function (x) { return esc(x.name); }).join(' \u2192 ') + '</b></div>'; }
    function itemRow(it) { return '<button class="so-it' + (it.done ? ' done' : '') + '" data-id="' + it.id + '"><span class="bx">\u2713</span><span class="tx">' + esc(it.label) + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</span></button>'; }
    function render() {
      var P = phases[ph], its = items.filter(function (x) { return x.cat === P.cat; }), done = its.filter(function (x) { return x.done; }).length, p = pct();
      ov.innerHTML = '<div class="so-wrap"><div class="so-top"><button class="so-x" title="Close">\u2715</button>' +
        '<div class="so-ring" style="background:conic-gradient(#e4be78 ' + (p * 3.6) + 'deg,rgba(255,255,255,.16) 0)"><span>' + p + '%</span></div>' +
        '<div class="so-tt"><div class="so-k">Trip mode</div><b>' + (esc(tripName()) || 'Your trip') + '</b></div></div>' +
        '<div class="so-phases">' + phases.map(function (x, i) { return '<button class="so-ph' + (i === ph ? ' on' : '') + (i < ph ? ' done' : '') + '" data-ph="' + i + '"><span class="ic">' + x.ic + '</span>' + x.t + '</button>'; }).join('') + '</div>' +
        condStrip() +
        '<div class="so-head"><span class="ic">' + P.ic + '</span><div><b>' + P.t + '</b><small>' + done + '/' + its.length + ' done \u00b7 ' + P.sub + '</small></div></div>' +
        '<div class="so-list">' + (its.length ? its.map(itemRow).join('') : '<div class="so-empty">Nothing in this phase yet.</div>') + '</div>' +
        '<div class="so-nav"><button class="so-prev"' + (ph === 0 ? ' disabled' : '') + '>\u2190 Back</button>' + (ph < phases.length - 1 ? '<button class="so-next">Next \u2192</button>' : '<button class="so-next done">\u2713 All set</button>') + '</div></div>';
    }
    ov.addEventListener('click', function (e) {
      if (e.target.closest('.so-x')) { ov.remove(); return; }
      var phb = e.target.closest('.so-ph'); if (phb) { ph = +phb.getAttribute('data-ph'); render(); return; }
      if (e.target.closest('.so-prev')) { if (ph > 0) { ph--; render(); } return; }
      if (e.target.closest('.so-next')) { if (ph < phases.length - 1) { ph++; render(); } else { ov.remove(); } return; }
      var it = e.target.closest('.so-it'); if (it) { var idx = find(it.getAttribute('data-id')); if (idx > -1) { items[idx].done = !items[idx].done; save(); renderLists(); render(); } }
    });
    render();
  }

  function boot() { return build(); }
  if (!boot()) { document.addEventListener('DOMContentLoaded', boot); window.addEventListener('load', boot); setTimeout(boot, 1000); }
})();
