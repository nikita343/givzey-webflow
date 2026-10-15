// Navbar dropdowns (design: Figma "Nav / Dropdown — *" frames in section 09.30).
// Markup: li.navbar_menu-item > a.navbar_link (trigger) + div.navbar_dropdown#id (panel).
// Hover opens on mouse (with a little intent delay), click/Enter/Space toggles everywhere,
// Escape closes and returns focus, clicking outside or tabbing away closes.
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const MOBILE = matchMedia('(max-width: 991px)');   // below this the nav is a full-screen menu with accordions

// full-screen menu (tablet / phone)
function mobileMenu(closeDropdowns) {
  const btn = document.querySelector('.navbar_menu-button'), menu = document.querySelector('.navbar_menu');
  if (!btn || !menu) return () => {};
  if (!menu.id) menu.id = 'navbar-menu';
  btn.setAttribute('aria-controls', menu.id);
  menu.querySelectorAll(':scope .navbar_menu-list > .navbar_menu-item').forEach((li, i) => li.style.setProperty('--i', i));
  const root = document.documentElement;
  let open = false;
  const set = v => {
    if (v === open) return; open = v;
    menu.classList.toggle('is-open', v);
    btn.setAttribute('aria-expanded', String(v));
    btn.setAttribute('aria-label', v ? 'Close menu' : 'Open menu');
    root.classList.toggle('gz-menu-open', v);
    v ? window.gzLenis?.stop() : window.gzLenis?.start();
    if (v) menu.querySelector('a')?.focus({ preventScroll: true });
    else closeDropdowns();
  };
  btn.addEventListener('click', e => { e.preventDefault(); set(!open); });
  btn.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); set(!open); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) { set(false); btn.focus(); } });
  // a real link inside the menu navigates: close first so the page underneath isn't left locked
  menu.addEventListener('click', e => { const a = e.target.closest('a'); if (a && !a.matches('.navbar_link[aria-haspopup]') && MOBILE.matches) set(false); });
  MOBILE.addEventListener('change', () => set(false));
  return set;
}

// Fixed navbar that steps aside: scrolling down slides it up out of view, any scroll up brings it back.
// Always shown at the very top, while the mobile menu or a dropdown is open, and while it holds keyboard focus.
// Off the top it gets a frosted band in its own variant (navy for Dark, white for Light) so it reads over any section.
// Reads window scroll, which Lenis drives too, so it works with and without smooth scroll.
const focusVisible = el => { const a = document.activeElement; try { return !!a && el.contains(a) && a.matches(':focus-visible'); } catch { return false; } };
function autoHide() {
  const nav = document.querySelector('.navbar_component'); if (!nav) return;
  const root = document.documentElement;
  const TOP = 64, DELTA = 6;
  let last = Math.max(0, scrollY), hidden = null, scrolled = null, queued = false;
  const setH = () => root.style.setProperty('--gz-nav-h', nav.offsetHeight + 'px');
  setH(); addEventListener('resize', setH);
  const locked = () => root.classList.contains('gz-menu-open') || !!nav.querySelector('.navbar_menu-item.is-open') || focusVisible(nav);
  const apply = (h, s) => {
    if (h !== hidden) { hidden = h; root.classList.toggle('gz-nav-hidden', h); }
    if (s !== scrolled) { scrolled = s; root.classList.toggle('gz-nav-scrolled', s); }
  };
  const update = () => {
    queued = false;
    const y = Math.max(0, scrollY);
    if (y <= TOP || locked()) { apply(false, y > 2); last = y; return; }
    if (Math.abs(y - last) < DELTA) { apply(hidden, true); return; }
    apply(y > last, true); last = y;
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  nav.addEventListener('focusin', update);
  // the mobile menu (html.gz-menu-open) or a dropdown (li.is-open) opening brings the bar back at once
  const mo = new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(update); } });
  mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  nav.querySelectorAll('.navbar_menu-item').forEach(li => mo.observe(li, { attributes: true, attributeFilter: ['class'] }));
  update();
}

export function initNav() {
  try { autoHide(); } catch (e) { console.error('[givzey] nav autoHide', e); }
  const items = [...document.querySelectorAll('.navbar_menu-item')].filter(li => li.querySelector(':scope > .navbar_dropdown'));
  if (!items.length) { mobileMenu(() => {}); return; }
  let open = null, tOpen = 0, tClose = 0;

  const set = (li, on) => {
    const trigger = li.querySelector(':scope > .navbar_link');
    li.classList.toggle('is-open', on);
    trigger.setAttribute('aria-expanded', String(on));
  };
  const show = li => { clearTimeout(tClose); if (open === li) return; if (open) set(open, false); set(li, true); open = li; };
  const hide = () => { clearTimeout(tOpen); if (!open) return; set(open, false); open = null; };

  items.forEach((li, n) => {
    const trigger = li.querySelector(':scope > .navbar_link');
    const panel = li.querySelector(':scope > .navbar_dropdown');
    if (!panel.id) panel.id = 'nav-panel-' + n;
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.setAttribute('role', 'button');
    panel.querySelectorAll('.navbar_dropdown-item, .navbar_dropdown-feature').forEach((a, i) => a.style.setProperty('--i', i));
    panel.querySelectorAll('.navbar_dropdown-label, .navbar_dropdown-arrow').forEach(l => l.setAttribute('aria-hidden', 'true'));

    trigger.addEventListener('click', e => { e.preventDefault(); open === li ? hide() : show(li); });
    trigger.addEventListener('keydown', e => {
      if (e.key === ' ') { e.preventDefault(); open === li ? hide() : show(li); }
      if (e.key === 'ArrowDown') { e.preventDefault(); show(li); panel.querySelector('a')?.focus(); }
    });
    if (FINE) {
      li.addEventListener('pointerenter', () => { if (MOBILE.matches) return; clearTimeout(tClose); clearTimeout(tOpen); tOpen = setTimeout(() => show(li), open ? 0 : 70); });
      li.addEventListener('pointerleave', () => { if (MOBILE.matches) return; clearTimeout(tOpen); tClose = setTimeout(() => { if (open === li) hide(); }, 220); });
    }
    li.addEventListener('focusout', e => { if (!li.contains(e.relatedTarget) && open === li) hide(); });
  });

  // links without a dropdown close whatever is open when hovered
  document.querySelectorAll('.navbar_menu-item').forEach(li => { if (!items.includes(li) && FINE) li.addEventListener('pointerenter', () => { if (!MOBILE.matches) hide(); }); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open) return;
    const t = open.querySelector(':scope > .navbar_link'); hide(); t.focus();
  });
  document.addEventListener('pointerdown', e => { if (open && !open.contains(e.target) && !MOBILE.matches) hide(); });
  addEventListener('scroll', () => { if (open && scrollY > 200 && !MOBILE.matches) hide(); }, { passive: true });
  mobileMenu(hide);
}
