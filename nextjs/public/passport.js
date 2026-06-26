/* ParkBuddy — shared Trip Passport component.
   Self-contained: injects its own styles + overlay, exposes window.__ppPassport.
   Reads the user's REAL saved trips:
     pp_map_trip  → array of park IDs (the Explore map "My Trip" cart)
     pp_trip2     → build-trip itinerary (stops[].pid / .p)
   Stamps (parks visited) persist in pp_stamped and sync via auth.js.
   Requires parks-data.js (window.PARK_BY_ID) loaded first. */
(function () {
  if (window.__ppPassport) return;

  var GREEN = "#1d4a37", GREEN2 = "#11301f", GOLD = "#c79a4b", GOLD2 = "#e4be78", CREAM = "#fbf6ea", INK = "#15241c", MUTED = "#8c8473";
  var SANS = "'Hanken Grotesk',system-ui,-apple-system,Segoe UI,Roboto,sans-serif";
  var SERIF = "'Spectral',Georgia,serif";
  var TOTAL = 63;
  var ICONS = ["🏔️","🌲","🏜️","⛰️","🏞️","🌄","🦅","🌋","🏕️","🌊","🍂","🪨"];

  function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
  function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v);}catch(e){return d;}}
  function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}

  function prefs(){return lsGet("pp_prefs",{})||{};}
  function holderName(){
    var p=prefs();
    if(p.name)return p.name;
    return "Guest Explorer";
  }
  function stamped(){var a=lsGet("pp_stamped",[]);return Array.isArray(a)?a:[];}
  function isStamped(id){return stamped().some(function(s){return s.id===id;});}

  // union of planned parks from both trip stores, in order, de-duped
  function plannedIds(){
    var ids=[], seen={};
    var map=lsGet("pp_map_trip",[]); if(Array.isArray(map))map.forEach(add);
    var bt=lsGet("pp_trip2",null);
    if(bt&&Array.isArray(bt.s))bt.s.forEach(function(st){var id=(st.pid!=null?st.pid:(st.p!=null?st.p:null));if(id!=null)add(id);});
    function add(id){id=+id;if(!seen[id]&&window.PARK_BY_ID&&window.PARK_BY_ID[id]){seen[id]=1;ids.push(id);}}
    return ids;
  }
  // all parks to show = planned ∪ stamped
  function passportParks(){
    var ids=plannedIds().slice();
    stamped().forEach(function(s){if(ids.indexOf(s.id)<0&&window.PARK_BY_ID&&window.PARK_BY_ID[s.id])ids.push(s.id);});
    return ids;
  }
  function iconFor(id){
    var p=window.PARK_BY_ID&&window.PARK_BY_ID[id];
    if(p&&window.REGION_ICON&&window.REGION_ICON[p.region]&&p.region!=="lower48")return window.REGION_ICON[p.region];
    return ICONS[id%ICONS.length];
  }
  function rank(n){
    if(n>=TOTAL)return "★ Grand Slam";
    if(n>=40)return "★ Park Legend";
    if(n>=20)return "★ Trailblazer";
    if(n>=10)return "★ Park Ranger";
    if(n>=5)return "★ Summit Seeker";
    if(n>=1)return "★ Trail Wanderer";
    return "★ Trailhead Rookie";
  }

  function stats(){
    var s=stamped().length;
    return {stamped:s,total:TOTAL,pct:Math.round(s/TOTAL*100),planned:plannedIds().length};
  }

  function ensureStyle(){
    if(document.getElementById("pp2-style"))return;
    var st=document.createElement("style");st.id="pp2-style";
    st.textContent=
      "@keyframes pp2in{from{transform:scale(.92) translateY(18px);opacity:0}to{transform:none;opacity:1}}"+
      "@keyframes pp2press{0%{transform:rotate(var(--r,-4deg)) scale(2.4);opacity:0}55%{opacity:1}100%{transform:rotate(var(--r,-4deg)) scale(1)}}"+
      "#pp2-ov{position:fixed;inset:0;z-index:100002;display:none;align-items:center;justify-content:center;padding:24px;background:rgba(8,16,12,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-family:"+SANS+"}"+
      "#pp2-ov.show{display:flex}"+
      ".pp2-book{width:min(900px,96vw);height:min(580px,88vh);position:relative;border-radius:18px;overflow:hidden;display:flex;background:linear-gradient(145deg,"+GREEN+","+GREEN2+");box-shadow:0 40px 100px rgba(0,0,0,.6);border:1px solid rgba(228,190,120,.3);animation:pp2in .5s cubic-bezier(.2,.8,.3,1)}"+
      ".pp2-close{position:absolute;top:14px;right:16px;z-index:5;width:34px;height:34px;border-radius:50%;border:none;background:rgba(20,36,28,.5);color:#fff;font-size:18px;cursor:pointer}"+
      ".pp2-cover{width:42%;min-width:230px;padding:38px 32px;display:flex;flex-direction:column;color:"+CREAM+";background:linear-gradient(160deg,"+GREEN+",#0e2a1d);border-right:2px dashed rgba(228,190,120,.3)}"+
      ".pp2-foil{font-size:.68rem;letter-spacing:.32em;text-transform:uppercase;color:"+GOLD2+";font-weight:700}"+
      ".pp2-title{font-family:"+SERIF+";font-weight:800;font-size:2.2rem;line-height:1.02;margin:8px 0 0;background:linear-gradient(120deg,#f3dca6,"+GOLD+");-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}"+
      ".pp2-emblem{width:90px;height:90px;border-radius:50%;border:2px solid rgba(228,190,120,.5);display:flex;align-items:center;justify-content:center;margin:24px 0;background:radial-gradient(circle,rgba(228,190,120,.16),transparent);font-size:2.4rem}"+
      ".pp2-prog{margin-top:6px}"+
      ".pp2-bar{height:8px;border-radius:999px;background:rgba(255,255,255,.14);overflow:hidden}"+
      ".pp2-bar>i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,"+GOLD2+","+GOLD+");transition:width .6s cubic-bezier(.2,.8,.3,1)}"+
      ".pp2-pl{display:flex;justify-content:space-between;font-size:.74rem;color:rgba(251,246,234,.72);font-weight:600;margin-top:7px}"+
      ".pp2-holder{margin-top:auto}"+
      ".pp2-lab{font-size:.62rem;letter-spacing:.2em;text-transform:uppercase;color:rgba(251,246,234,.55)}"+
      ".pp2-nm{font-family:"+SERIF+";font-size:1.2rem;font-weight:600;border-bottom:1px solid rgba(228,190,120,.4);padding-bottom:6px;margin-top:3px}"+
      ".pp2-rank{margin-top:13px;display:inline-flex;align-items:center;gap:7px;font-size:.74rem;font-weight:700;color:"+INK+";background:linear-gradient(120deg,"+GOLD2+","+GOLD+");padding:6px 12px;border-radius:999px;align-self:flex-start}"+
      ".pp2-pages{flex:1;background:"+CREAM+";padding:28px 30px;overflow-y:auto}"+
      ".pp2-ph{display:flex;align-items:baseline;justify-content:space-between;border-bottom:2px solid #ece0c6;padding-bottom:10px}"+
      ".pp2-ph h3{font-family:"+SERIF+";font-weight:700;color:"+GREEN+";font-size:1.25rem;margin:0}"+
      ".pp2-ph .dt{font-size:.74rem;color:"+MUTED+";font-weight:600}"+
      ".pp2-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:13px;margin-top:18px}"+
      ".pp2-stamp{aspect-ratio:1;border-radius:50%;border:2.5px dashed "+GREEN+";display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6px;color:"+GREEN+";cursor:pointer;transform:rotate(var(--r,-4deg));background:rgba(29,74,55,.05);transition:background .2s,transform .15s}"+
      ".pp2-stamp:hover{background:rgba(29,74,55,.1)}"+
      ".pp2-stamp.empty{border-style:dotted;border-color:#cbbfa3;color:#b3a98f;background:transparent}"+
      ".pp2-stamp .ic{font-size:1.15rem}"+
      ".pp2-stamp .pk{font-family:"+SERIF+";font-weight:700;font-size:.74rem;line-height:1.04;margin-top:2px}"+
      ".pp2-stamp .yr{font-size:.56rem;letter-spacing:.1em;margin-top:3px;font-weight:700}"+
      ".pp2-stamp.pressed{animation:pp2press .5s cubic-bezier(.3,1.4,.4,1)}"+
      ".pp2-empty{margin-top:26px;text-align:center;color:"+MUTED+";font-size:.9rem;line-height:1.55}"+
      ".pp2-empty .big{font-size:2.4rem;display:block;margin-bottom:10px}"+
      ".pp2-empty a{display:inline-block;margin-top:14px;background:linear-gradient(120deg,"+GOLD2+","+GOLD+");color:"+INK+";text-decoration:none;font-weight:700;font-size:.82rem;padding:10px 18px;border-radius:10px}"+
      ".pp2-hint{margin-top:16px;font-size:.74rem;color:"+MUTED+";text-align:center}"+
      ".pp2-actions{display:flex;gap:10px;margin-top:20px}"+
      ".pp2-btn{flex:1;padding:11px;border-radius:10px;border:none;font-family:"+SANS+";font-weight:700;font-size:.82rem;cursor:pointer}"+
      ".pp2-btn.gold{background:linear-gradient(120deg,"+GOLD2+","+GOLD+");color:"+INK+"}"+
      ".pp2-btn.ghost{background:#fff;border:1px solid #e3d8c2;color:"+GREEN+"}"+
      "@media(max-width:640px){.pp2-book{flex-direction:column;height:min(620px,90vh)}.pp2-cover{width:auto;border-right:none;border-bottom:2px dashed rgba(228,190,120,.3);padding:24px}.pp2-emblem{display:none}.pp2-grid{grid-template-columns:repeat(2,1fr)}}";
    document.head.appendChild(st);
  }

  var ov=null;
  function build(){
    ensureStyle();
    if(ov)return ov;
    ov=document.createElement("div");ov.id="pp2-ov";
    ov.innerHTML=
      '<div class="pp2-book">'+
        '<button class="pp2-close" aria-label="Close">&times;</button>'+
        '<div class="pp2-cover">'+
          '<div class="pp2-foil">National Parks · Trip Passport</div>'+
          '<div class="pp2-title">ParkBuddy</div>'+
          '<div class="pp2-emblem">🏔️</div>'+
          '<div class="pp2-prog"><div class="pp2-bar"><i id="pp2-fill"></i></div>'+
            '<div class="pp2-pl"><span id="pp2-count">0 of 63 parks</span><span id="pp2-pct">0%</span></div></div>'+
          '<div class="pp2-holder"><div class="pp2-lab">Passport holder</div>'+
            '<div class="pp2-nm" id="pp2-nm">Guest Explorer</div>'+
            '<span class="pp2-rank" id="pp2-rank">★ Trailhead Rookie</span></div>'+
        '</div>'+
        '<div class="pp2-pages">'+
          '<div class="pp2-ph"><h3 id="pp2-title">My Passport</h3><span class="dt" id="pp2-dt"></span></div>'+
          '<div id="pp2-body"></div>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);
    ov.querySelector(".pp2-close").onclick=close;
    ov.onclick=function(e){if(e.target===ov)close();};
    return ov;
  }

  function render(){
    build();
    var s=stats();
    document.getElementById("pp2-nm").textContent=holderName();
    document.getElementById("pp2-rank").textContent=rank(s.stamped);
    document.getElementById("pp2-count").textContent=s.stamped+" of "+TOTAL+" parks";
    document.getElementById("pp2-pct").textContent=s.pct+"%";
    document.getElementById("pp2-fill").style.width=Math.max(2,s.pct)+"%";

    var ids=passportParks();
    var body=document.getElementById("pp2-body");
    var dt=document.getElementById("pp2-dt");
    if(!ids.length){
      dt.textContent="";
      body.innerHTML='<div class="pp2-empty"><span class="big">🛂</span>Your passport is waiting for its first stamp.<br>Add parks to a trip, then come back to stamp the ones you\u2019ve visited.<br><a href="/explore">Explore the map →</a></div>';
      return;
    }
    dt.textContent=s.stamped+" stamped · "+ids.length+" in your trips";
    body.innerHTML='<div class="pp2-grid" id="pp2-grid">'+ids.map(function(id){
      var p=window.PARK_BY_ID[id], on=isStamped(id), r=(-6+(id*4)%11);
      var st=stamped().find(function(x){return x.id===id;});
      var yr=on&&st&&st.year?st.year:"— — —";
      return '<div class="pp2-stamp'+(on?"":" empty")+'" data-id="'+id+'" style="--r:'+r+'deg" title="'+(on?"Visited — tap to remove stamp":"Tap to stamp as visited")+'">'+
        '<div class="ic">'+iconFor(id)+'</div><div class="pk">'+esc(p.name)+'</div><div class="yr">'+yr+'</div></div>';
    }).join("")+'</div>'+
    '<div class="pp2-hint">Tap a park to stamp it as visited — your passport remembers, even across devices when signed in.</div>'+
    '<div class="pp2-actions"><a class="pp2-btn gold" href="/build-trip" style="text-decoration:none;text-align:center">Plan another trip</a>'+
    '<button class="pp2-btn ghost" id="pp2-share">Share passport</button></div>';

    body.querySelectorAll(".pp2-stamp").forEach(function(el){
      el.onclick=function(){toggleStamp(+el.getAttribute("data-id"),el);};
    });
    var sh=body.querySelector("#pp2-share");
    if(sh)sh.onclick=function(){
      var s2=stats();
      var msg="My ParkBuddy passport: "+s2.stamped+"/"+TOTAL+" national parks — "+rank(s2.stamped).replace("★ ","")+"!";
      if(navigator.share){navigator.share({title:"My ParkBuddy Passport",text:msg,url:location.origin}).catch(function(){});}
      else if(navigator.clipboard){navigator.clipboard.writeText(msg+" "+location.origin).then(function(){flash("Copied to clipboard!");},function(){});}
      else{flash(msg);}
    };
  }

  function toggleStamp(id,el){
    var arr=stamped();
    var i=arr.findIndex(function(x){return x.id===id;});
    var pressing=i<0;
    if(pressing)arr.push({id:id,year:String(new Date().getFullYear())});
    else arr.splice(i,1);
    lsSet("pp_stamped",arr); // patched setItem in auth.js pushes to cloud
    // update just this stamp + the cover stats, with press animation
    var s=stats();
    document.getElementById("pp2-rank").textContent=rank(s.stamped);
    document.getElementById("pp2-count").textContent=s.stamped+" of "+TOTAL+" parks";
    document.getElementById("pp2-pct").textContent=s.pct+"%";
    document.getElementById("pp2-fill").style.width=Math.max(2,s.pct)+"%";
    var dt=document.getElementById("pp2-dt");if(dt)dt.textContent=s.stamped+" stamped · "+passportParks().length+" in your trips";
    if(el){
      var p=window.PARK_BY_ID[id], yr=pressing?String(new Date().getFullYear()):"— — —";
      el.className="pp2-stamp"+(pressing?"":" empty");
      el.querySelector(".yr").textContent=yr;
      el.title=pressing?"Visited — tap to remove stamp":"Tap to stamp as visited";
      if(pressing){void el.offsetWidth;el.classList.add("pressed");}
    }
    if(typeof window.__ppOnPassportChange==="function"){try{window.__ppOnPassportChange(s);}catch(e){}}
  }

  function flash(msg){
    var t=document.getElementById("pp2-toast");
    if(!t){t=document.createElement("div");t.id="pp2-toast";t.style.cssText="position:fixed;bottom:64px;left:50%;transform:translateX(-50%);z-index:100003;background:rgba(20,36,28,.94);color:#fbf6ea;font-family:"+SANS+";font-weight:600;font-size:.84rem;padding:11px 18px;border-radius:999px;box-shadow:0 8px 26px rgba(0,0,0,.35);opacity:0;transition:opacity .25s";document.body.appendChild(t);}
    t.textContent=msg;t.style.opacity="1";clearTimeout(t._t);t._t=setTimeout(function(){t.style.opacity="0";},2200);
  }

  function open(){render();build().classList.add("show");}
  function close(){if(ov)ov.classList.remove("show");}

  window.__ppPassport={open:open,close:close,stats:stats,rank:rank};
})();
