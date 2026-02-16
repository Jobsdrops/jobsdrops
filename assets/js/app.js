
(function(){
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function toast(msg){
    const el = $("#toast");
    if(!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(el._t);
    el._t = setTimeout(()=> el.classList.remove("show"), 2200);
  }

  // mark active link
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  $$(".js-navlink").forEach(a=>{
    const href = (a.getAttribute("href") || "").toLowerCase();
    if(href === path) a.classList.add("active");
  });
  $$(".js-navpill").forEach(a=>{
    const href = (a.getAttribute("href") || "").toLowerCase();
    if(href === path) a.classList.add("active");
  });

    // simple client-side filtering for listing pages
  const listRoot = $("#listRoot");
  if(listRoot){
    const q = $("#q");
    const typeSel = $("#type");
    const provSel = $("#province");

	    // Listing cards are the ones that actually have structured listing metadata.
	    // We scope all logic to these so we don't break homepage feature cards.
	    const LISTING_SEL = '.card[data-closing][data-type]';

const chipsWrap = $("#bursaryChips");
let activeCategory = "all";
if(chipsWrap){
  chipsWrap.addEventListener("click", (e)=>{
    const btn = e.target.closest && e.target.closest(".chip");
    if(!btn) return;
    activeCategory = (btn.getAttribute("data-cat") || "all").toLowerCase();
    $$(".chip", chipsWrap).forEach(c=> c.classList.remove("active"));
    btn.classList.add("active");
    apply();
  });
}

    const pageHTML = listRoot.innerHTML;
    let globalHTML = null;
    let activeHTML = pageHTML;

    function norm(s){ return (s||"").toString().trim().toLowerCase(); }

    // --- Listing auto-expiry (optional per-card) ---
    function parseISODate(s){
      // expects YYYY-MM-DD
      const m = /^\s*(\d{4})-(\d{2})-(\d{2})\s*$/.exec(s || "");
      if(!m) return null;
      const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
      const dt = new Date(y, mo, d);
      // Validate (e.g., 2026-02-31 should fail)
      if(dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
      dt.setHours(0,0,0,0);
      return dt;
    }

    function parseTextDate(raw){
      // supports: "27 Feb", "27 Feb 2026", "27 February", "27 February 2026"
      const s = (raw||"").toString().trim();
      const rx = /(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?/;
      const m = rx.exec(s);
      if(!m) return null;
      const day = Number(m[1]);
      const monName = m[2].slice(0,3).toLowerCase();
      const months = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
      if(!(monName in months)) return null;
      const year = m[3] ? Number(m[3]) : 2026;
      const dt = new Date(year, months[monName], day);
      if(dt.getFullYear() !== year || dt.getMonth() !== months[monName] || dt.getDate() !== day) return null;
      return dt;
    }

    function inferDatesFromMeta(card){
      // Backward-compatible: if listings don't have data-closing/open, infer from the visible meta text.
      const meta = card.querySelector(".meta");
      if(!meta) return;
      const spans = Array.from(meta.querySelectorAll("span")).map(s=> (s.textContent||"").trim());
      // Infer closing
      const hasClosing = (card.getAttribute("data-closing") || card.dataset.closing || "").trim();
      if(!hasClosing){
        const closeSpan = spans.find(t=> /^closes\s*:/i.test(t));
        if(closeSpan){
          const raw = closeSpan.replace(/^closes\s*:\s*/i,"").trim();
          const dt = parseTextDate(raw);
          if(dt){
            const y = dt.getFullYear();
            const m = String(dt.getMonth()+1).padStart(2,"0");
            const d = String(dt.getDate()).padStart(2,"0");
            card.dataset.closing = `${y}-${m}-${d}`;
          }
        }
      }
      // Infer opening
      const hasOpen = (card.getAttribute("data-open") || card.dataset.open || "").trim();
      if(!hasOpen){
        const openSpan = spans.find(t=> /^opens\s*:/i.test(t));
        if(openSpan){
          const raw = openSpan.replace(/^opens\s*:\s*/i,"").trim();
          const dt = parseTextDate(raw);
          if(dt){
            const y = dt.getFullYear();
            const m = String(dt.getMonth()+1).padStart(2,"0");
            const d = String(dt.getDate()).padStart(2,"0");
            card.dataset.open = `${y}-${m}-${d}`;
          }
        }
      }
    }


    function todayDate(){
      const t = new Date();
      t.setHours(0,0,0,0);
      return t;
    }

    function ensureClosedBadge(card){
      const top = card.querySelector(".card-top");
      if(!top) return;
      if(top.querySelector(".badge.closed")) return;
      const b = document.createElement("span");
      b.className = "badge warn closed";
      b.textContent = "Closed";
      top.appendChild(b);
    }

    function removeClosedBadge(card){
      card.querySelectorAll(".badge.closed").forEach(b=> b.remove());
    }

    function getApplyLink(card){
      // Primary pattern used across JobsDrops
      let a = card.querySelector(".card-actions a.link");
      // Fallbacks (if a page uses a different apply markup)
      if(!a) a = card.querySelector("[data-apply]");
      if(!a) a = card.querySelector("a.apply, a.apply-btn, .apply-btn a");
      return a;
    }

    function disableApply(card, label){
      const a = getApplyLink(card);
      if(!a) return;
      if(!a.dataset.href) a.dataset.href = a.getAttribute("href") || "";
      if(!a.dataset.label) a.dataset.label = a.textContent || "";
      a.removeAttribute("href");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("tabindex", "-1");
      a.classList.add("is-disabled");
      a.textContent = label || "Closed";
    }

    function restoreApply(card){
      const a = getApplyLink(card);
      if(!a) return;
      const href = a.dataset.href;
      const label = a.dataset.label;
      if(href) a.setAttribute("href", href);
      a.removeAttribute("aria-disabled");
      a.removeAttribute("tabindex");
      a.classList.remove("is-disabled");
      if(label) a.textContent = label;
    }

    function ensureUpcomingBadge(card, openRaw){
      const top = card.querySelector(".card-top");
      if(!top) return;
      if(top.querySelector(".badge.upcoming")) return;
      const b = document.createElement("span");
      b.className = "badge upcoming";
      b.textContent = openRaw ? ("Opens " + openRaw) : "Opens soon";
      top.appendChild(b);
    }

    function removeUpcomingBadge(card){
      card.querySelectorAll(".badge.upcoming").forEach(b=> b.remove());
    }

    

function cleanTopBadges(card){
  const top = card.querySelector(".card-top");
  if(!top) return;
  const badges = Array.from(top.querySelectorAll(".badge"));
  // keep only the first badge (listing type), remove any others (open/new/hot/etc)
  badges.slice(1).forEach(b=> b.remove());
}

function removeStatusBits(card){
  card.querySelectorAll(".js-status-badge").forEach(b=> b.remove());
  const sub = card.querySelector(".js-badge-sub");
  if(sub) sub.remove();
  card.classList.remove("is-closed","is-upcoming");
  delete card.dataset.daysLeft;
}

function setStatusBadge(card, text, cls){
  const top = card.querySelector(".card-top");
  if(!top) return;
  // Keep the first badge (usually the listing type) and clear any other badges beyond the first
  const allBadges = Array.from(top.querySelectorAll('.badge'));
  allBadges.slice(1).forEach(b=> b.remove());
  const b = document.createElement("span");
  b.className = "badge js-status-badge " + (cls||"");
  b.textContent = text;
  top.appendChild(b);
}

function setBadgeSub(card, text){
  let sub = card.querySelector(".js-badge-sub");
  if(!text){
    if(sub) sub.remove();
    return;
  }
  if(!sub){
    sub = document.createElement("div");
    sub.className = "badge-sub js-badge-sub";
    // place after the card-top, before the title
    const top = card.querySelector(".card-top");
    if(top && top.parentNode){
      top.insertAdjacentElement("afterend", sub);
    }else{
      card.insertAdjacentElement("afterbegin", sub);
    }
  }
  sub.textContent = text;
}

function daysBetween(a, b){
  // a, b are Date objects at midnight
  return Math.floor((b - a) / 86400000);
}

function applyExpiry(){
  const cards = $$(LISTING_SEL, listRoot);
  const t = todayDate();
  const pageTypeNow = document.body ? (document.body.getAttribute("data-page-type") || "").toLowerCase() : "";

  cards.forEach(card=>{
    inferDatesFromMeta(card);
    const type = (card.getAttribute("data-type") || "").toLowerCase();
    const isBursary = (pageTypeNow === "bursary") || (type === "bursary");
    const keep = ((card.getAttribute("data-keep") || card.dataset.keep || "").toLowerCase() === "true") || isBursary;

    const openRaw = card.getAttribute("data-open") || card.dataset.open || "";
    const closingRaw = card.getAttribute("data-closing") || card.dataset.closing || "";
    const publishedRaw = card.getAttribute("data-published") || card.dataset.published || "";
    const hot = (card.getAttribute("data-hot") || card.dataset.hot || "").toLowerCase() === "true";

    const openDate = openRaw ? parseISODate(openRaw) : null;
    const closeDate = closingRaw ? parseISODate(closingRaw) : null;
    const pubDate = publishedRaw ? parseISODate(publishedRaw) : null;

    cleanTopBadges(card);
    removeStatusBits(card);

    // If we previously hid it but it's meant to be kept, unhide
    if(keep && card.dataset.expired === "1"){
      card.dataset.expired = "0";
      card.style.display = "";
    }

    // Default: enabled apply unless we decide otherwise
    const setClosed = ()=>{
      card.classList.add("is-closed");
      disableApply(card, "Closed");
      setStatusBadge(card, "CLOSED", "closed bad");
    };

    // --- Upcoming (before open date) ---
    if(openDate && t < openDate){
      card.dataset.expired = "0";
      card.classList.add("is-upcoming");
      disableApply(card, "Opens soon");
      setStatusBadge(card, ("Opens " + openRaw), "");
      // For bursaries, add clarity line
      if(isBursary){
        setBadgeSub(card, "Not open yet — check back on the opening date.");
      }
      return;
    }

    // --- No closing date ---
    if(!closeDate){
      // If within first 7 days of being added to JobsDrops: NEW
      if(pubDate){
        const age = daysBetween(pubDate, t);
        if(age >= 0 && age <= 7){
          setStatusBadge(card, "NEW", "");
        }else if(hot){
          setStatusBadge(card, "HOT", "warn");
        }
      }else if(hot){
        setStatusBadge(card, "HOT", "warn");
      }
      restoreApply(card);
      card.dataset.expired = "0";
      return;
    }

    // --- Closing-date based states ---
    const daysLeft = daysBetween(t, closeDate);
    card.dataset.daysLeft = String(daysLeft);

    if(daysLeft < 0){
      // Closed
      card.dataset.expired = "0";
      if(isBursary){
        setClosed();
        setBadgeSub(card, "Closed for this academic year.");
        return; // never hide bursaries
      }

      // Non-bursary: keep visible for 14 days after closing, then hide unless keep
      const daysAfter = Math.abs(daysLeft);
      if(daysAfter <= 14){
        setClosed();
        card.dataset.expired = "0";
      }else{
        if(keep){
          setClosed();
          card.dataset.expired = "0";
        }else{
          card.dataset.expired = "1";
          card.style.display = "none";
        }
      }
      return;
    }

    // Open (including closing date day)
    card.dataset.expired = "0";
    restoreApply(card);

    // Inside 30-day window: countdown badge + color scale
    if(daysLeft <= 30){
      let label = "";
      if(daysLeft === 0) label = "Closes today";
      else if(daysLeft === 1) label = "1 day left";
      else label = daysLeft + " days left";

      let cls = "";
      if(daysLeft >= 21) cls = "good";
      else if(daysLeft >= 8) cls = "warn";
      else if(daysLeft >= 2) cls = "orange";
      else cls = "bad";

      setStatusBadge(card, label, cls);
      return;
    }

    // Outside 30-day window: HOT or NEW (NEW only within 7 days since added)
    if(hot){
      setStatusBadge(card, "HOT", "warn");
      return;
    }
    if(pubDate){
      const age = daysBetween(pubDate, t);
      if(age >= 0 && age <= 7){
        setStatusBadge(card, "NEW", "");
      }
    }
  });
}


    
function initReadMoreCards(){
  const cards = $$(LISTING_SEL, listRoot);
  cards.forEach(card=>{
    const btn = card.querySelector(".readmore-link");
    const more = card.querySelector(".listing-more");
    const actions = card.querySelector(".card-actions");
    if(!btn || !actions) return;

    // Ensure structural order: expanded content before actions, controls at bottom
    if(more && more.parentNode === card && more.nextElementSibling !== actions){
      card.insertBefore(more, actions);
    }
    if(!actions.contains(btn)){
      actions.insertAdjacentElement("afterbegin", btn);
    }

    // Normalize initial state
    const expanded = btn.getAttribute("aria-expanded") === "true";
    if(more){
      if(expanded){
        more.hidden = false;
        more.classList.add("is-open");
        card.classList.add("rm-open");
        btn.textContent = "Read less";
      }else{
        more.classList.remove("is-open");
        more.hidden = true;
        card.classList.remove("rm-open");
        btn.setAttribute("aria-expanded","false");
        btn.textContent = "Read more";
      }
    }

    if(btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", ()=>{
      if(!more) return;
      const isOpen = card.classList.contains("rm-open");

      if(!isOpen){
        // Store where the user was before expanding (for smooth return)
        card.dataset.rmScroll = String(window.scrollY);

        more.hidden = false;
        // Let hidden removal apply before animating
        requestAnimationFrame(()=> more.classList.add("is-open"));
        card.classList.add("rm-open");
        btn.setAttribute("aria-expanded","true");
        btn.textContent = "Read less";
      }else{
        more.classList.remove("is-open");
        card.classList.remove("rm-open");
        btn.setAttribute("aria-expanded","false");
        btn.textContent = "Read more";

        // After transition, hide content for accessibility
        setTimeout(()=>{ more.hidden = true; }, 380);

        const prevY = Number(card.dataset.rmScroll || "");
        if(Number.isFinite(prevY)){
          window.scrollTo({ top: prevY, behavior: "smooth" });
        }else{
          card.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });
}


async function ensureGlobal(){
      if(globalHTML !== null) return;
      try{
        const res = await fetch("data/all-listings.html", { cache: "no-store" });
        globalHTML = await res.text();
      }catch(err){
        globalHTML = pageHTML;
      }
    }

    function setDataset(html){
      if(activeHTML === html) return;
      activeHTML = html;
      listRoot.innerHTML = html;
    }

    function clearInlineAds(){
      $$(".js-inline-ad", listRoot).forEach(el=> el.remove());
    }


function renderClosingSoon(){
  const box = $("#closingSoonRoot");
  const list = $("#closingSoonList");
  if(!box || !list) return;
  list.innerHTML = "";
  const cards = $$(LISTING_SEL, listRoot).filter(c => c.style.display !== "none");
  const soon = [];
  cards.forEach((card, idx)=>{
    const dl = Number(card.dataset.daysLeft);
    if(Number.isFinite(dl) && dl >= 0 && dl <= 30){
      // ensure an id to jump to
      if(!card.id) card.id = "listing-" + (idx+1);
      const title = (card.querySelector("h3")?.textContent || "Listing").trim();
      const badge = (card.querySelector(".js-status-badge")?.textContent || "").trim();
      soon.push({dl, id: card.id, title, badge});
    }
  });
  soon.sort((a,b)=> a.dl - b.dl);
  if(soon.length === 0){
    box.setAttribute("hidden","");
    return;
  }
  box.removeAttribute("hidden");
  soon.forEach(item=>{
    const row = document.createElement("div");
    row.className = "mini";
    const a = document.createElement("a");
    a.href = "#" + item.id;
    a.textContent = item.title;
    a.addEventListener("click", (e)=>{
      // smooth scroll + open the card for easier applying
      e.preventDefault();
      const target = document.getElementById(item.id);
      if(!target) return;
      target.scrollIntoView({behavior:"smooth", block:"start"});
      // open the card if it has read more
      const btn = target.querySelector(".readmore-link");
      if(btn && btn.textContent.toLowerCase().includes("read more")){
        setTimeout(()=> btn.click(), 450);
      }
    });
    const b = document.createElement("span");
    b.className = "badge";
    // Re-use the already computed label (e.g., "12 days left")
    b.textContent = item.badge || (item.dl === 0 ? "Closes today" : (item.dl === 1 ? "1 day left" : item.dl + " days left"));
    row.appendChild(a);
    row.appendChild(b);
    list.appendChild(row);
  });
}

    function injectInlineAds(){
      clearInlineAds();
      const visibleCards = $$(LISTING_SEL, listRoot).filter(c => c.style.display !== "none");
      let count = 0;
      visibleCards.forEach((card, i)=>{
        count++;
        if(count % 9 === 0 && i !== visibleCards.length - 1){
          const ad = document.createElement("div");
          ad.className = "ad-slot js-inline-ad";
          ad.setAttribute("aria-label", "Ad slot");
          ad.textContent = "----";
          card.insertAdjacentElement("afterend", ad);
        }
      });
    }

    async function apply(){
      const needle = norm(q && q.value);
      const t = norm(typeSel && typeSel.value);
      const p = norm(provSel && provSel.value);

      // Dataset source:
      // - Weekly (data-page-type=all) uses the combined pool in /data/all-listings.html
      // - Category pages use ONLY their own HTML (no cross-page bleed)
      const pageTypeNow = document.body ? (document.body.getAttribute("data-page-type") || "").toLowerCase() : "";
      if (pageTypeNow === "all") {
        await ensureGlobal();
        setDataset(globalHTML || pageHTML);
      } else {
        setDataset(pageHTML);
      }

      // Apply auto-expiry rules (optional per listing via data-closing="YYYY-MM-DD")
      applyExpiry();

      const cards = $$(LISTING_SEL, listRoot);
      let shown = 0;

      cards.forEach(card=>{
        const hay = norm(card.getAttribute("data-search"));
        const ct = norm(card.getAttribute("data-type"));
        const cp = norm(card.getAttribute("data-province"));

        
const okNeedle = !needle || hay.includes(needle);
const okType = !t || t === "all" || ct === t;
const okProv = !p || p === "all" || cp === p;

// Optional bursary category chips (only on bursaries page)
const pageTypeNow2 = document.body ? (document.body.getAttribute("data-page-type") || "").toLowerCase() : "";
const cat = norm(card.getAttribute("data-category"));
const okCat = (pageTypeNow2 !== "bursary") || (activeCategory === "all") || (cat === activeCategory);

const ok = okNeedle && okType && okProv && okCat;
        card.style.display = ok ? "" : "none";
        if(ok) shown++;
      });

      const counter = $("#counter");
      if(counter) counter.textContent = shown.toString();

      // Bursaries: render "Closing this month"
      renderClosingSoon();

      // Insert ad slots after every 9 visible listings
      injectInlineAds();

      // Normalize Read more / Apply placement and behavior
      initReadMoreCards();
    }

    [q, typeSel, provSel].forEach(el=>{
      if(!el) return;
      el.addEventListener("input", apply);
      el.addEventListener("change", apply);
    });

    $("#resetBtn")?.addEventListener("click", ()=>{
      if(q) q.value = "";
      if(typeSel) typeSel.value = "all";
      if(provSel) provSel.value = "all";
      apply();
      toast("Filters cleared");
    });

    apply();
  }


  // newsletter demo
  $("#newsletterForm")?.addEventListener("submit", (e)=>{
    e.preventDefault();
    toast("Saved! (wire this to your email tool later)");
    e.target.reset();
  });

  // quick copy on CV Builder page (static demo)
  $$(".js-copy").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const target = btn.getAttribute("data-copy");
      const el = target ? document.querySelector(target) : null;
      const txt = el ? el.textContent : "";
      try{
        await navigator.clipboard.writeText(txt);
        toast("Copied");
      }catch(err){
        toast("Copy not available here");
      }
    });
  });

	})();
