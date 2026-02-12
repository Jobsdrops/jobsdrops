
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

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

    function applyExpiry(){
      const cards = $$(".card", listRoot);
      const t = todayDate();

      cards.forEach(card=>{
        // allow opting out from auto-hide / auto-delete
        const keep = (card.getAttribute("data-keep") || card.dataset.keep || "").toLowerCase() === "true";

        // handle optional open window (useful for recurring items like NSFAS)
        const openRaw = card.getAttribute("data-open") || card.dataset.open || "";
        const closingRaw = card.getAttribute("data-closing") || card.dataset.closing || "";

        const openDate = openRaw ? parseISODate(openRaw) : null;
        const closeDate = closingRaw ? parseISODate(closingRaw) : null;

        // If we previously hid it but it's meant to be kept, unhide
        if(keep && card.dataset.expired === "1"){
          card.dataset.expired = "0";
          card.style.display = "";
        }

        // No dates => leave as-is
        if(!openDate && !closeDate){
          card.dataset.expired = "0";
          card.classList.remove("is-closed","is-upcoming");
          removeClosedBadge(card);
          removeUpcomingBadge(card);
          restoreApply(card);
          return;
        }

        // Before open date => show as upcoming, disable apply, do not hide
        if(openDate && t < openDate){
          card.dataset.expired = "0";
          card.classList.remove("is-closed");
          card.classList.add("is-upcoming");
          removeClosedBadge(card);
          ensureUpcomingBadge(card, openRaw);
          disableApply(card, "Opens soon");
          return;
        }

        // Determine close logic
        if(!closeDate){
          // open date passed, but no closing date provided => treat as open
          card.dataset.expired = "0";
          card.classList.remove("is-closed","is-upcoming");
          removeClosedBadge(card);
          removeUpcomingBadge(card);
          restoreApply(card);
          return;
        }

        // After open window start: normal expiry handling
        const diffDays = Math.floor((t - closeDate) / 86400000); // days after closing date
        if(diffDays <= 0){
          // still open (including closing date itself)
          card.dataset.expired = "0";
          card.classList.remove("is-closed","is-upcoming");
          removeClosedBadge(card);
          removeUpcomingBadge(card);
          restoreApply(card);
        }else if(diffDays <= 7){
          // closed, visible for 7 days
          card.dataset.expired = "0";
          card.classList.add("is-closed");
          card.classList.remove("is-upcoming");
          ensureClosedBadge(card);
          removeUpcomingBadge(card);
          disableApply(card, "Closed");
        }else{
          // hide after 7 days unless it's marked to keep
          if(keep){
            card.dataset.expired = "0";
            card.classList.add("is-closed");
            card.classList.remove("is-upcoming");
            ensureClosedBadge(card);
            removeUpcomingBadge(card);
            disableApply(card, "Closed");
          }else{
            card.dataset.expired = "1";
            card.style.display = "none";
          }
        }
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

    function injectInlineAds(){
      clearInlineAds();
      const visibleCards = $$(".card", listRoot).filter(c => c.style.display !== "none");
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

      const cards = $$(".card", listRoot);
      let shown = 0;

      cards.forEach(card=>{
        const hay = norm(card.getAttribute("data-search"));
        const ct = norm(card.getAttribute("data-type"));
        const cp = norm(card.getAttribute("data-province"));

        const okNeedle = !needle || hay.includes(needle);
        const okType = !t || t === "all" || ct === t;
        const okProv = !p || p === "all" || cp === p;

        const ok = okNeedle && okType && okProv;
        card.style.display = ok ? "" : "none";
        if(ok) shown++;
      });

      const counter = $("#counter");
      if(counter) counter.textContent = shown.toString();

      // Insert ad slots after every 9 visible listings
      injectInlineAds();
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
// Inline "Read more" expansion for listing cards (no modal)
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.readmore-link');
  if (!btn) return;
  const card = btn.closest('article.card');
  if (!card) return;
  const more = card.querySelector('.listing-more');
  if (!more) return;

  const actions = card.querySelector('.card-actions');

  // Store original order the first time we ever open this card
  if (!card.dataset.rmInit) {
    card.dataset.rmInit = '1';
    if (actions) {
      card.dataset.rmActionsAfter = (actions.nextElementSibling === more) ? '1' : '0';
    }
  }

  // Save scroll position so "Read less" can take you back
  if (!card.dataset.rmScrollY) {
    card.dataset.rmScrollY = String(window.scrollY || 0);
  }

  const isOpen = card.classList.toggle('is-open');
  btn.setAttribute('aria-expanded', String(isOpen));
  btn.textContent = isOpen ? 'Read less' : 'Read more';

  if (isOpen) {
    // Show content first
    more.removeAttribute('hidden');

    // Move Apply + Read less to the bottom of the card, after the expanded content
    // Order: details -> apply -> read less
    if (actions) card.appendChild(actions);
    card.appendChild(btn);
  } else {
    // Restore original order: read more -> apply -> (details hidden)
    if (actions) {
      card.insertBefore(btn, actions);
      card.insertBefore(actions, more);
    } else {
      card.insertBefore(btn, more);
    }

    // Hide after a short delay so any CSS transition can finish
    setTimeout(() => more.setAttribute('hidden', ''), 180);

    const y = Number(card.dataset.rmScrollY || 0);
    delete card.dataset.rmScrollY;
    // Smoothly return to where the user was before expanding
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
});
