/* ParkBuddy — Trip Checklist (Phase 1).
   A "don't forget" checklist that lives in the Build-a-Trip itinerary. Three
   categories by when/where: Pack before · Grab on the way · Do at destination.
   Add / edit / delete / reorder / check, one-tap starter templates, persists in
   localStorage alongside the trip. Subtle shop hook on buyable "do" items. */
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
    babies: { label: '\uD83C\uDF7C Babies & toddlers', items: [['pack', 'Milk powder / formula'], ['pack', 'Diapers & wipes'], ['pack', 'Baby food & snacks'], ['pack', 'Bottles & straws'], ['pack', 'Change of clothes'], ['grab', 'Fresh milk / water']] },
    cookout: { label: '\uD83C\uDF56 Cookout / BBQ', items: [['pack', 'Grill & grate'], ['pack', 'Utensils & tongs'], ['pack', 'Foil & trash bags'], ['grab', 'Charcoal / propane'], ['grab', 'Lighter & matches'], ['grab', 'Ice & drinks']] },
    hiking: { label: '\uD83E\uDD7E Hiking day', items: [['pack', 'Day pack'], ['pack', 'First-aid kit'], ['pack', 'Sunscreen & hat'], ['pack', 'Trail map'], ['grab', 'Water & snacks'], ['do', 'Sunrise summit photo']] }
  };
  var BUYABLE = /souvenir|gift|patch|magnet|postcard|sticker|hat|shirt|mug|poster|pin|book|hot chocolate|snack|treat|fudge|jerky/i;

  var items = load();
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} }
  function uid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function css() {
    if (document.getElementById('pbck-css')) return;
    var s = document.createElement('style'); s.id = 'pbck-css';
    s.textContent =
      ".pbck{max-width:1320px;margin:0 auto;padding:6px clamp(16px,3vw,28px) 10px;font-family:'Hanken Grotesk',system-ui,sans-serif}" +
      ".pbck-card{background:#fffdf7;border:1px solid #e7ddca;border-radius:22px;padding:clamp(16px,2.4vw,24px);box-shadow:0 22px 50px -30px rgba(28,46,34,.4),0 2px 6px rgba(28,46,34,.05)}" +
      ".pbck-h{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}" +
      ".pbck-h .ey{font-size:.66rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#c79a4b;margin-bottom:5px}" +
      ".pbck-h h2{font-family:'Spectral',serif;font-weight:800;font-size:clamp(1.5rem,2.6vw,2rem);color:#1d3941;line-height:1.05}.pbck-h h2 em{font-style:italic;color:#2c5562}" +
      ".pbck-h .sub{font-size:.86rem;color:#5b6258;margin-top:5px;max-width:54ch;line-height:1.45}" +
      ".pbck-prog{font-family:'Spectral',serif;font-weight:800;font-size:1.5rem;color:#2c5562;white-space:nowrap}.pbck-prog span{font-size:.8rem;color:#8c8473;font-weight:600;font-family:inherit}" +
      ".pbck-tpl{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px}" +
      ".pbck-tpl button{border:1px dashed #d8c9a6;background:#fbf6ea;color:#1d4a37;font-family:inherit;font-weight:700;font-size:.8rem;padding:8px 13px;border-radius:999px;cursor:pointer;transition:.15s}" +
      ".pbck-tpl button:hover{border-color:#c79a4b;background:#fff}" +
      ".pbck-tpl .clr{margin-left:auto;color:#9a6a52;border-color:#e7ddca;border-style:solid}" +
      ".pbck-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}" +
      ".pbck-col{background:#fbf7ed;border:1px solid #ece2cd;border-radius:16px;padding:13px;display:flex;flex-direction:column;min-height:120px}" +
      ".pbck-ct{display:flex;align-items:center;gap:8px;margin-bottom:10px}" +
      ".pbck-ct .ic{width:30px;height:30px;flex:none;border-radius:9px;background:#eef3ec;display:flex;align-items:center;justify-content:center;font-size:.95rem}" +
      ".pbck-ct b{font-family:'Spectral',serif;font-weight:700;font-size:.98rem;color:#1d3941;line-height:1}.pbck-ct small{display:block;font-size:.66rem;color:#8c8473;font-weight:600;margin-top:2px}" +
      ".pbck-ct .n{margin-left:auto;font-size:.7rem;font-weight:800;color:#8c8473;background:#fff;border:1px solid #e7ddca;border-radius:999px;padding:3px 9px}" +
      ".pbck-list{display:flex;flex-direction:column;gap:7px;flex:1}" +
      ".pbck-it{display:flex;align-items:flex-start;gap:9px;background:#fff;border:1px solid #e7ddca;border-radius:11px;padding:9px 10px}" +
      ".pbck-it.done{background:#f3f1e6;border-color:#e7ddca}" +
      ".pbck-ck{flex:none;width:21px;height:21px;margin-top:1px;border-radius:6px;border:2px solid #cdbf9f;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.74rem;font-weight:800;color:transparent;transition:.15s}" +
      ".pbck-it.done .pbck-ck{background:linear-gradient(135deg,#2f7d4f,#1d4a37);border-color:#1d4a37;color:#fff}" +
      ".pbck-b{flex:1;min-width:0}" +
      ".pbck-lbl{font-size:.88rem;font-weight:600;color:#2c3a30;line-height:1.3;outline:none;border-radius:4px}" +
      ".pbck-lbl:focus{box-shadow:0 0 0 2px rgba(199,154,75,.4);background:#fffbf0}" +
      ".pbck-it.done .pbck-lbl{color:#9aa090;text-decoration:line-through}" +
      ".pbck-note{font-size:.74rem;color:#8c8473;line-height:1.3;outline:none;margin-top:2px;border-radius:4px}" +
      ".pbck-note:empty:before{content:attr(data-ph);color:#bcb199;cursor:text}" +
      ".pbck-note:focus{box-shadow:0 0 0 2px rgba(199,154,75,.3);background:#fffbf0}" +
      ".pbck-shop{display:inline-flex;align-items:center;gap:4px;font-size:.7rem;font-weight:700;color:#b07d3a;text-decoration:none;margin-top:4px}.pbck-shop:hover{color:#8a5f20;text-decoration:underline}" +
      ".pbck-acts{display:flex;flex-direction:column;gap:1px;flex:none}" +
      ".pbck-acts button{background:none;border:none;color:#b8ad95;cursor:pointer;font-size:.8rem;line-height:1;padding:2px 3px;border-radius:4px}.pbck-acts button:hover{color:#2c5562;background:#f1ead9}" +
      ".pbck-acts .x:hover{color:#b06a4a}" +
      ".pbck-add{display:flex;gap:6px;margin-top:9px}" +
      ".pbck-add input{flex:1;min-width:0;padding:9px 11px;border:1px solid #e1d8c4;border-radius:10px;font-size:.82rem;font-family:inherit;background:#fff;color:#1a2b21;outline:none}" +
      ".pbck-add input:focus{border-color:#c79a4b;box-shadow:0 0 0 3px rgba(199,154,75,.16)}" +
      ".pbck-add button{flex:none;width:38px;border:none;border-radius:10px;background:#2c5562;color:#fff;font-size:1.1rem;cursor:pointer;box-shadow:0 3px 0 #16303a}.pbck-add button:active{transform:translateY(2px);box-shadow:0 1px 0 #16303a}" +
      ".pbck-empty{font-size:.78rem;color:#a7a08c;text-align:center;padding:14px 6px;font-style:italic}" +
      "@media(max-width:860px){.pbck-grid{grid-template-columns:1fr}}";
    document.head.appendChild(s);
  }

  function itemHtml(it) {
    var shop = (it.cat === 'do' && BUYABLE.test(it.label)) ?
      '<a class="pbck-shop" href="/shop.html">\uD83D\uDECD Find it in our shop</a>' : '';
    return '<div class="pbck-it' + (it.done ? ' done' : '') + '" data-id="' + it.id + '" draggable="false">' +
      '<button class="pbck-ck" data-act="toggle" title="Done">\u2713</button>' +
      '<div class="pbck-b">' +
        '<div class="pbck-lbl" contenteditable="true" spellcheck="false" data-act="label">' + esc(it.label) + '</div>' +
        '<div class="pbck-note" contenteditable="true" spellcheck="false" data-act="note" data-ph="+ add a note">' + esc(it.note || '') + '</div>' +
        shop +
      '</div>' +
      '<div class="pbck-acts"><button data-act="up" title="Move up">\u2191</button><button data-act="down" title="Move down">\u2193</button><button class="x" data-act="del" title="Remove">\u2715</button></div>' +
    '</div>';
  }

  function renderLists() {
    CATS.forEach(function (c) {
      var list = document.querySelector('.pbck-list[data-cat="' + c.id + '"]');
      if (!list) return;
      var its = items.filter(function (x) { return x.cat === c.id; });
      list.innerHTML = its.length ? its.map(itemHtml).join('') : '<div class="pbck-empty">Nothing yet \u2014 add an item or a template above.</div>';
      var cnt = document.querySelector('.pbck-n[data-cat="' + c.id + '"]');
      if (cnt) { var d = its.filter(function (x) { return x.done; }).length; cnt.textContent = its.length ? (d + '/' + its.length) : '0'; }
    });
    var total = items.length, done = items.filter(function (x) { return x.done; }).length;
    var p = document.querySelector('.pbck-prog');
    if (p) p.innerHTML = total ? (done + '<span>/' + total + ' packed</span>') : '<span>add your first item</span>';
  }

  function addItem(cat, label) {
    label = (label || '').trim(); if (!label) return;
    items.push({ id: uid(), cat: cat, label: label, note: '', done: false });
    save(); renderLists();
  }
  function find(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return i; return -1; }
  function move(id, dir) {
    var i = find(id); if (i < 0) return; var it = items[i];
    var sameCat = items.filter(function (x) { return x.cat === it.cat; });
    var pos = sameCat.indexOf(it); var swap = sameCat[pos + dir]; if (!swap) return;
    var a = find(it.id), b = find(swap.id); items[a] = swap; items[b] = it;
    save(); renderLists();
  }

  function addTemplate(key) {
    var t = TPL[key]; if (!t) return;
    t.items.forEach(function (p) { items.push({ id: uid(), cat: p[0], label: p[1], note: '', done: false }); });
    save(); renderLists();
  }

  function build() {
    var sheet = document.querySelector('.sheet');
    if (!sheet) return false;
    if (document.querySelector('.pbck')) return true;
    css();
    var sec = document.createElement('section');
    sec.className = 'pbck';
    sec.innerHTML = '<div class="pbck-card">' +
      '<div class="pbck-h"><div><div class="ey">Trip checklist \u00b7 don\u2019t forget</div>' +
      '<h2>Packed &amp; <em>nothing forgotten</em></h2>' +
      '<div class="sub">The safety net for the rush before you leave \u2014 organised by when &amp; where it happens. Saves with your trip.</div></div>' +
      '<div class="pbck-prog"><span>add your first item</span></div></div>' +
      '<div class="pbck-tpl">' +
        '<button data-tpl="babies">' + TPL.babies.label + '</button>' +
        '<button data-tpl="cookout">' + TPL.cookout.label + '</button>' +
        '<button data-tpl="hiking">' + TPL.hiking.label + '</button>' +
        '<button class="clr" data-clr="1">Clear all</button>' +
      '</div>' +
      '<div class="pbck-grid">' + CATS.map(function (c) {
        return '<div class="pbck-col"><div class="pbck-ct"><span class="ic">' + c.ic + '</span><div><b>' + c.t + '</b><small>' + c.sub + '</small></div><span class="n pbck-n" data-cat="' + c.id + '">0</span></div>' +
          '<div class="pbck-list" data-cat="' + c.id + '"></div>' +
          '<form class="pbck-add" data-cat="' + c.id + '"><input placeholder="Add an item\u2026" maxlength="80"><button type="submit" title="Add">+</button></form></div>';
      }).join('') + '</div>' +
    '</div>';
    sheet.appendChild(sec);
    renderLists();
    wire(sec);
    return true;
  }

  function wire(sec) {
    // add forms
    [].slice.call(sec.querySelectorAll('.pbck-add')).forEach(function (f) {
      f.addEventListener('submit', function (e) { e.preventDefault(); var i = f.querySelector('input'); addItem(f.getAttribute('data-cat'), i.value); i.value = ''; i.focus(); });
    });
    // templates
    [].slice.call(sec.querySelectorAll('[data-tpl]')).forEach(function (b) { b.addEventListener('click', function () { addTemplate(b.getAttribute('data-tpl')); }); });
    var clr = sec.querySelector('[data-clr]');
    if (clr) clr.addEventListener('click', function () { if (!items.length || confirm('Clear the whole checklist?')) { items = []; save(); renderLists(); } });
    // item actions (delegated)
    sec.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('[data-act]'); if (!btn) return;
      var act = btn.getAttribute('data-act'); if (act !== 'toggle' && act !== 'up' && act !== 'down' && act !== 'del') return;
      var row = btn.closest('.pbck-it'); if (!row) return; var id = row.getAttribute('data-id'); var idx = find(id); if (idx < 0) return;
      if (act === 'toggle') { items[idx].done = !items[idx].done; save(); renderLists(); }
      else if (act === 'del') { items.splice(idx, 1); save(); renderLists(); }
      else if (act === 'up') move(id, -1);
      else if (act === 'down') move(id, 1);
    });
    // inline edit (label/note) on blur
    sec.addEventListener('blur', function (e) {
      var el = e.target; if (!el.getAttribute) return; var act = el.getAttribute('data-act');
      if (act !== 'label' && act !== 'note') return;
      var row = el.closest('.pbck-it'); if (!row) return; var idx = find(row.getAttribute('data-id')); if (idx < 0) return;
      var val = el.textContent.trim();
      if (act === 'label') { if (!val) { items.splice(idx, 1); } else { items[idx].label = val; } }
      else { items[idx].note = val; }
      save(); renderLists();
    }, true);
    sec.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.getAttribute && e.target.getAttribute('data-act') === 'label') { e.preventDefault(); e.target.blur(); }
    });
  }

  function boot() { return build(); }
  if (!boot()) {
    document.addEventListener('DOMContentLoaded', boot);
    window.addEventListener('load', boot);
    setTimeout(boot, 1000);
  }
})();
