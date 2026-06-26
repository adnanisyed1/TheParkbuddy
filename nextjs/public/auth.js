/* ParkPulse / ParkBuddy — accounts, Google sign-in & cloud sync (Supabase).
   ------------------------------------------------------------------
   - A welcome modal greets visitors: "Continue with Google" or "Continue as a guest".
   - Guests are fully functional (everything saved locally in the browser).
   - Signed-in users get trips, cost settings & map cart synced to their account
     across devices.
   - After dismissing, a small avatar (signed in) or "Sign in" pill (guest) stays
     top-right so they can sign in/out anytime.
   - Safe to ship before configuring: with placeholder keys this file does nothing.

   Loads AFTER the Supabase browser client (CDN) and supabase-config.js. */
(function () {
  var TRACK = ["pp_trip2", "pp_map_trip", "pp_favorites"];

  function configured() {
    var u = window.SUPABASE_URL, k = window.SUPABASE_ANON_KEY;
    return !!u && !!k && u.indexOf("YOUR_") !== 0 && k.indexOf("YOUR_") !== 0 &&
           typeof window.supabase !== "undefined";
  }

  if (window.__ppAuth) { try { window.__ppAuth.render(); } catch (e) {} return; }
  if (!configured()) { return; }

  var supa = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  var user = null, pushT = null;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  // ---------- cloud read / write (single JSONB row per user) ----------
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
        if (!data || !Object.keys(data).length) { pushCloud(); return false; }
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

  (function patchStorage() {
    var orig = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function (k, v) {
      orig(k, v);
      if (user && TRACK.indexOf(k) >= 0) pushCloud();
    };
  })();

  // ---------- shared bits ----------
  var FONT = "'Hanken Grotesk',system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  var SERIF = "'Spectral',Georgia,serif";
  var GREEN = "#1d4a37", INK = "#1d3a2b", GOLD = "#c79a4b", CREAM = "#fffdf7", MUTED = "#8c8473";
  var GOOGLE_SVG = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.3 6.6v5.5h7c4.1-3.8 6.6-9.4 6.6-16.1z"/><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7-5.5c-2 1.3-4.5 2.1-7.5 2.1-5.7 0-10.5-3.8-12.2-9.1H4.5v5.7C8.1 41.1 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.8 28.1c-.5-1.3-.7-2.7-.7-4.1s.3-2.8.7-4.1v-5.7H4.5C3 17.1 2.1 20.4 2.1 24s.9 6.9 2.4 9.8l7.3-5.7z"/><path fill="#EA4335" d="M24 10.7c3.2 0 6.1 1.1 8.4 3.3l6.2-6.2C34.9 4.1 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.2l7.3 5.7c1.7-5.2 6.5-9.2 12.2-9.2z"/></svg>';
  var TREE_SVG = '<svg width="26" height="26" viewBox="0 0 24 24" fill="' + GOLD + '"><path d="M12 2l5 9h-3l5 9H5l5-9H7z"/><rect x="11" y="18" width="2" height="4"/></svg>';

  function signIn() {
    supa.auth.signInWithOAuth({ provider: "google", options: { redirectTo: location.href.split("#")[0] } });
  }

  // ---------- welcome modal ----------
  function closeWelcome() {
    var o = document.getElementById("pp-welcome");
    if (!o) return;
    o.style.opacity = "0";
    var card = o.firstChild; if (card) card.style.transform = "translateY(8px) scale(.98)";
    setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 220);
  }
  function showWelcome() {
    if (!document.body || document.getElementById("pp-welcome")) return;
    if (!document.getElementById("pp-welcome-style")) {
      var st = document.createElement("style");
      st.id = "pp-welcome-style";
      st.textContent = "@keyframes ppCardIn{from{transform:translateY(10px) scale(.97)}to{transform:none}}";
      document.head.appendChild(st);
    }
    var ov = document.createElement("div");
    ov.id = "pp-welcome";
    ov.style.cssText = "position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:22px;" +
      "background:rgba(18,28,22,.55);-webkit-backdrop-filter:blur(7px);backdrop-filter:blur(7px);" +
      "opacity:1;transition:opacity .22s ease;font-family:" + FONT;

    var card = document.createElement("div");
    card.style.cssText = "background:" + CREAM + ";width:100%;max-width:392px;box-sizing:border-box;border-radius:22px;padding:34px 30px 28px;text-align:center;" +
      "box-shadow:0 24px 70px rgba(0,0,0,.32);border:1px solid #ece3d0;animation:ppCardIn .28s cubic-bezier(.2,.8,.3,1)";
    card.innerHTML =
      '<div style="width:60px;height:60px;border-radius:18px;background:' + GREEN + ';display:flex;align-items:center;justify-content:center;margin:0 auto 18px;box-shadow:0 6px 18px rgba(29,74,55,.3)">' + TREE_SVG + '</div>' +
      '<h2 style="font-family:' + SERIF + ';font-weight:700;font-size:1.5rem;color:' + INK + ';margin:0 0 8px;letter-spacing:-.01em">Welcome to ParkBuddy</h2>' +
      '<p style="color:' + MUTED + ';font-size:.92rem;line-height:1.5;margin:0 auto 22px;max-width:300px">Sign in to save your trips, itineraries &amp; favorites across all your devices — or keep exploring as a guest.</p>' +
      '<button id="pp-w-google" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;padding:13px;border-radius:12px;border:1px solid #dcd3bf;background:#fff;color:' + INK + ';font-family:inherit;font-weight:600;font-size:.95rem;cursor:pointer;transition:box-shadow .15s,border-color .15s">' + GOOGLE_SVG + 'Continue with Google</button>' +
      '<button id="pp-w-guest" style="width:100%;margin-top:11px;padding:13px;border-radius:12px;border:none;background:transparent;color:' + GREEN + ';font-family:inherit;font-weight:600;font-size:.92rem;cursor:pointer">Continue as a guest</button>' +
      '<div style="margin-top:16px;color:#a79f8c;font-size:.74rem;line-height:1.45">Guests can use everything. Your data stays in this browser until you sign in.</div>';

    ov.appendChild(card);
    document.body.appendChild(ov);

    var g = card.querySelector("#pp-w-google");
    g.onmouseenter = function () { g.style.boxShadow = "0 3px 12px rgba(0,0,0,.12)"; g.style.borderColor = "#c9bfa6"; };
    g.onmouseleave = function () { g.style.boxShadow = "none"; g.style.borderColor = "#dcd3bf"; };
    g.onclick = function () { signIn(); };
    card.querySelector("#pp-w-guest").onclick = function () {
      try { localStorage.setItem("pp_welcomed", "1"); } catch (e) {}
      closeWelcome();
    };
  }

  // ---------- persistent top-right control ----------
  function topRight() {
    var ex = document.getElementById("pp-acct"); if (ex) ex.remove();
    if (!document.body) return;
    var wrap = document.createElement("div");
    wrap.id = "pp-acct";
    wrap.style.cssText = "position:fixed;top:13px;right:15px;z-index:99990;font-family:" + FONT;

    if (user) {
      var meta = user.user_metadata || {};
      var name = meta.full_name || meta.name || user.email || "Account";
      var pic = meta.avatar_url || meta.picture || "";
      var initial = (name[0] || "U").toUpperCase();
      var btn = document.createElement("button");
      btn.setAttribute("aria-label", "Account menu");
      btn.style.cssText = "width:38px;height:38px;border-radius:999px;border:2px solid " + CREAM + ";cursor:pointer;overflow:hidden;background:" + GREEN + ";color:#fff;font-weight:700;font-size:15px;box-shadow:0 2px 10px rgba(0,0,0,.28);padding:0;display:flex;align-items:center;justify-content:center";
      btn.innerHTML = pic ? '<img src="' + esc(pic) + '" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover" alt="">' : initial;
      var pop = document.createElement("div");
      pop.style.cssText = "position:absolute;top:46px;right:0;background:" + CREAM + ";border:1px solid #e6ddc9;border-radius:13px;box-shadow:0 10px 30px rgba(0,0,0,.2);min-width:220px;padding:8px;display:none";
      pop.innerHTML =
        '<div style="padding:9px 11px 11px;border-bottom:1px solid #efe7d6;margin-bottom:6px">' +
          '<div style="font-weight:700;color:' + INK + ';font-size:.93rem">' + esc(name) + "</div>" +
          (user.email ? '<div style="color:' + MUTED + ';font-size:.78rem;margin-top:2px">' + esc(user.email) + "</div>" : "") +
        "</div>" +
        '<div style="padding:6px 11px 9px;color:#3f7a4a;font-size:.78rem;line-height:1.45">&#9729; Your trips &amp; settings are synced to this account.</div>' +
        '<button id="pp-signout" style="width:100%;padding:9px;border:none;border-radius:9px;background:' + GREEN + ';color:#fff;font-weight:600;font-size:.84rem;cursor:pointer">Sign out</button>';
      btn.onclick = function (e) { e.stopPropagation(); pop.style.display = pop.style.display === "none" ? "block" : "none"; };
      document.addEventListener("click", function () { pop.style.display = "none"; });
      pop.addEventListener("click", function (e) { e.stopPropagation(); });
      wrap.appendChild(btn); wrap.appendChild(pop);
      document.body.appendChild(wrap);
      pop.querySelector("#pp-signout").onclick = function () { supa.auth.signOut(); };
    } else {
      var pill = document.createElement("button");
      pill.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 15px;border-radius:999px;border:1px solid #e6ddc9;background:" + CREAM + ";color:" + INK + ";font-family:inherit;font-weight:600;font-size:.82rem;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.16)";
      pill.innerHTML = GOOGLE_SVG + "Sign in";
      pill.onclick = function () { showWelcome(); };
      wrap.appendChild(pill);
      document.body.appendChild(wrap);
    }
  }

  function render() { topRight(); }
  function maybeWelcome() {
    if (!user) { try { if (!localStorage.getItem("pp_welcomed")) showWelcome(); } catch (e) {} }
  }

  window.__ppAuth = { render: render, supa: supa, showWelcome: showWelcome };

  function mount() { render(); maybeWelcome(); }
  if (document.body) mount(); else document.addEventListener("DOMContentLoaded", mount);

  supa.auth.getSession().then(function (res) {
    user = (res && res.data && res.data.session) ? res.data.session.user : null;
    render();
    if (user) {
      closeWelcome();
      pullCloud().then(function (changed) {
        if (changed && !sessionStorage.getItem("pp_resynced")) {
          sessionStorage.setItem("pp_resynced", "1");
          location.reload();
        }
      });
    } else {
      sessionStorage.removeItem("pp_resynced");
      maybeWelcome();
    }
  });

  supa.auth.onAuthStateChange(function (evt, session) {
    user = session ? session.user : null;
    render();
    if (user) closeWelcome();
    if (evt === "SIGNED_OUT") { sessionStorage.removeItem("pp_resynced"); location.reload(); }
  });
})();
