// Navbar dropdowns (design: Figma "Nav / Dropdown — *" frames in section 09.30).
// Markup: li.navbar_menu-item > a.navbar_link (trigger) + div.navbar_dropdown#id (panel).
// Hover opens on mouse (with a little intent delay), click/Enter/Space toggles everywhere,
// Escape closes and returns focus, clicking outside or tabbing away closes.
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

export function initNav() {
  const items = [...document.querySelectorAll('.navbar_menu-item')].filter(li => li.querySelector(':scope > .navbar_dropdown'));
  if (!items.length) return;
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
      li.addEventListener('pointerenter', () => { clearTimeout(tClose); clearTimeout(tOpen); tOpen = setTimeout(() => show(li), open ? 0 : 70); });
      li.addEventListener('pointerleave', () => { clearTimeout(tOpen); tClose = setTimeout(() => { if (open === li) hide(); }, 220); });
    }
    li.addEventListener('focusout', e => { if (!li.contains(e.relatedTarget) && open === li) hide(); });
  });

  // links without a dropdown close whatever is open when hovered
  document.querySelectorAll('.navbar_menu-item').forEach(li => { if (!items.includes(li) && FINE) li.addEventListener('pointerenter', hide); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !open) return;
    const t = open.querySelector(':scope > .navbar_link'); hide(); t.focus();
  });
  document.addEventListener('pointerdown', e => { if (open && !open.contains(e.target)) hide(); });
  addEventListener('scroll', () => { if (open && scrollY > 200) hide(); }, { passive: true });
}
