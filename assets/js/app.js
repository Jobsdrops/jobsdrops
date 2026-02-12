
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
