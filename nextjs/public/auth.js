/* ParkPulse — accounts, Google sign-in & cloud sync (Supabase).
   ------------------------------------------------------------------
   - Guests are untouched: everything keeps saving to localStorage.
   - Signed-in users get their trips, cost settings & map cart synced to
     their account, so it follows them across devices.
   - Renders a small avatar / "Sign in" menu fixed at the top-right.
   - Safe to ship before configuring: if supabase-config.js still has the
     placeholder values, this file does nothing and the app behaves as before.

   Loads AFTER the Supabase browser client (CDN) and supabase-config.js. */
(function () {
  // localStorage keys we mirror to the cloud:
  //   pp_trip2     → built trip + cost settings (gas/hotel/food) on /build-trip
  //   pp_map_trip  → the homepage "My Trip" cart
  //   pp_favorites → reserved for favorite parks (added later)
  var TRACK = ["pp_trip2", "pp_map_trip", "pp_favorites"];

  function configured() {
    var u = window.SUPABASE_URL, k = window.SUPABASE_ANON_KEY;
    return !!u && !!k && u.indexOf("YOUR_") !== 0 && k.indexOf("YOUR_") !== 0 &&
           typeof window.supabase !== "undefined";
  }

  // Re-running on client-side navigation should not re-patch storage or
  // double-init; just make sure the menu is present and bail.
  if (window.__ppAuth) {
    try { window.__ppAuth.render(); } catch (e) {}
    return;
  }

  if (!configured()) { return; }

  var supa = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  var user = null, pushT = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---- cloud read / write (single JSONB row per user) ----
  function gather() {
    var o = {};
    TRACK.forEach(function (k) {
      var v = localStorage.getItem(k);
      if (v != null) { try { o[k] = JSON.parse(v); } catch (e) { o[k] = v; } }
    });
    return o;
  }
  function pushCloud() {
    if (!user) return;
    clearTimeout(pushT);
    pushT = setTimeout(function () {
      supa.from("user_data")
        .upsert({ id: user.id, data: gather(), updated_at: new Date().toISOString() })
        .then(function () {}, function () {});
    }, 600);
  }
  function pullCloud() {
    if (!user) return Promise.resolve(false);
    return supa.from("user_data").select("data").eq("id", user.id).maybeSingle()
      .then(function (res) {
        var data = res && res.data && res.data.data;
        if (!data || !Object.keys(data).length) { pushCloud(); return false; } // first login → seed cloud
        var changed = false;
        TRACK.forEach(function (k) {
          if (data[k] != null) {
            var nv = JSON.stringify(data[k]);
            if (localStorage.getItem(k) !== nv) { localStorage.setItem(k, nv); changed = true; }
          }
        });
        return changed;
      }, function () { return false; });
  }

  // ---- mirror tracked localStorage writes up to the cloud ----
  (function patchStorage() {
    var orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      orig(k, v);
      if (user && TRACK.indexOf(k) >= 0) pushCloud();
    };
  })();

  // ---- avatar / sign-in menu (fixed, top-right) ----
  function render() {
    var id = "pp-acct";
    var ex = document.getElementById(id); if (ex) ex.remove();
    if (!document.body) return;
    var wrap = document.createElement("div");
    wrap.id = id;
    wrap.style.cssText = "position:fixed;top:13px;right:15px;z-index:99999;font-family:'Hanken Grotesk',system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

    if (user) {
      var meta = user.user_metadata || {};
      var name = meta.full_name || meta.name || user.email || "Account";
      var pic = meta.avatar_url || meta.picture || "";
      var initial = (name[0] || "U").toUpperCase();
      var btn = document.createElement("button");
      btn.setAttribute("aria-label", "Account menu");
      btn.style.cssText = "width:38px;height:38px;border-radius:999px;border:2px solid #fffdf7;cursor:pointer;overflow:hidden;background:#1d4a37;color:#fff;font-weight:700;font-size:15px;box-shadow:0 2px 10px rgba(0,0,0,.28);padding:0;display:flex;align-items:center;justify-content:center";
      btn.innerHTML = pic ? '<img src="' + esc(pic) + '" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover" alt="">' : initial;

      var pop = document.createElement("div");
      pop.style.cssText = "position:absolute;top:46px;right:0;background:#fffdf7;border:1px solid #e6ddc9;border-radius:13px;box-shadow:0 10px 30px rgba(0,0,0,.2);min-width:218px;padding:8px;display:none";
      pop.innerHTML =
        '<div style="padding:9px 11px 11px;border-bottom:1px solid #efe7d6;margin-bottom:6px">' +
          '<div style="font-weight:700;color:#1d3a2b;font-size:.93rem">' + esc(name) + "</div>" +
          (user.email ? '<div style="color:#8c8473;font-size:.78rem;margin-top:2px">' + esc(user.email) + "</div>" : "") +
        "</div>" +
        '<div style="padding:6px 11px 9px;color:#3f7a4a;font-size:.78rem;line-height:1.45">&#9729; Your trips &amp; settings are saved to this account.</div>' +
        '<button id="pp-signout" style="width:100%;padding:9px;border:none;border-radius:9px;background:#1d4a37;color:#fff;font-weight:600;font-size:.84rem;cursor:pointer">Sign out</button>';

      btn.onclick = function (e) { e.stopPropagation(); pop.style.display = pop.style.display === "none" ? "block" : "none"; };
      document.addEventListener("click", function () { pop.style.display = "none"; });
      pop.addEventListener("click", function (e) { e.stopPropagation(); });
      wrap.appendChild(btn); wrap.appendChild(pop);
      document.body.appendChild(wrap);
      pop.querySelector("#pp-signout").onclick = function () { supa.auth.signOut(); };
    } else {
      var sbtn = document.createElement("button");
      sbtn.style.cssText = "display:flex;align-items:center;gap:9px;padding:9px 15px;border-radius:999px;border:1px solid #e6ddc9;background:#fffdf7;color:#1d3a2b;font-weight:600;font-size:.82rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.16)";
      sbtn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.6-9.4 6.6-16.1z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.7 0-10.5-3.8-12.2-9.1H4.5v5.7C8.1 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.5C3 17.1 2.1 20.4 2.1 24s.9 6.9 2.4 9.8l7.3-5.7z"/><path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.2-6.2C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.2l7.3 5.7c1.7-5.2 6.5-9.2 12.2-9.2z"/></svg>' +
        "Sign in";
      sbtn.onclick = function () {
        supa.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } });
      };
      wrap.appendChild(sbtn);
      document.body.appendChild(wrap);
    }
  }

  window.__ppAuth = { render: render, supa: supa };

  function mount() { render(); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  // session on load → pull cloud → refresh once so the app re-reads synced data
  supa.auth.getSession().then(function (res) {
    user = (res && res.data && res.data.session) ? res.data.session.user : null;
    render();
    if (user) {
      pullCloud().then(function (changed) {
        if (changed && !sessionStorage.getItem("pp_resynced")) {
          sessionStorage.setItem("pp_resynced", "1");
          location.reload();
        }
      });
    } else {
      sessionStorage.removeItem("pp_resynced");
    }
  });

  supa.auth.onAuthStateChange(function (evt, session) {
    user = session ? session.user : null;
    render();
    if (evt === "SIGNED_OUT") { sessionStorage.removeItem("pp_resynced"); location.reload(); }
  });
})();
