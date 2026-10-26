// Hovers: ink and light, never the usual "lift a few pixels".
//  - buttons: an ink blot spreads from where the cursor enters (wobbly edge via SVG turbulence) and the glow deepens
//  - text links: a straight underline wipes in from the left and out to the right (pure CSS, see styles.css)
//  - cards: a light follows the cursor along the border and pools softly inside, tinted per product
//  - nav: one liquid highlight glides between items
//  - logos: no hover motion
import { gsap } from 'gsap';

const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

function injectFilter() {
  if (document.getElementById('gz-ink-edge')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<filter id="gz-ink-edge" x="-20%" y="-20%" width="140%" height="140%">
    <feTurbulence type="fractalNoise" baseFrequency=".028" numOctaves="2" seed="7" result="n">
      <animate attributeName="baseFrequency" dur="6s" values=".028;.036;.028" repeatCount="indefinite"/></feTurbulence>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G"/></filter>`;
  document.body.appendChild(svg);
}

function local(e, el) { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; }

function buttons() {
  document.querySelectorAll('.button').forEach(btn => {
    if (btn.querySelector('.gz-btn-ink')) return;
    const ink = document.createElement('span'); ink.className = 'gz-btn-ink'; ink.setAttribute('aria-hidden', 'true');
    btn.prepend(ink);
    const place = e => { const [x, y, r] = local(e, btn); btn.style.setProperty('--x', x + 'px'); btn.style.setProperty('--y', y + 'px'); btn.style.setProperty('--d', Math.hypot(r.width, r.height) * 2.2 + 'px'); };
    btn.addEventListener('pointerenter', place);
    btn.addEventListener('pointerleave', place);
  });
}

// client tracker 26 Oct: straight underline instead of the brush stroke (same wipe in/out)
const BRUSH = `<svg viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M1 5H199" pathLength="1"/></svg>`;
// every plain text link on the site draws the homepage brush line on hover (Q.A.)
export const TEXT_LINKS = '.home-product_link, .home-story_link, .footer_link, .footer_legal-link, .footer_email, .v2-link, .cr-link, .sol-link, .res-link, .res-more, .cs-sector_link, .blog-promo_link, .demo_fallback-link, .res-hero_crumb, .post-more_link, .post-author_link, .sol-doc_link, .gd-tpl_dl, .wb-up_reg, .post-body a, .w-richtext a';
function links() {
  document.querySelectorAll(TEXT_LINKS).forEach(a => {
    if (a.querySelector('.gz-underline')) return;
    const u = document.createElement('span'); u.className = 'gz-underline'; u.innerHTML = BRUSH; a.appendChild(u);
  });
}

// product pages carry their accent on the hero visual (VEO orange, VPGO green, VSO purple)
const ACCENT = () => document.querySelector('.product-hero_visual.is-vpgo') ? '46,158,94' : document.querySelector('.product-hero_visual.is-vso') ? '107,63,209' : document.querySelector('.product-hero_visual.is-gap') ? '30,99,233' : '242,140,40';
const GLOW = [
  ['.home-product_visual', null],
  ['.home-stats_card', '88,165,251'],
  ['.home-testimonials_logo-card', '88,165,251'],
  ['.cta_component', '88,165,251'],
  ['.navbar_dropdown-feature', '171,230,255'],
  ['.veo-cap_card:not(.is-text)', '242,140,40'],
  ['.veo-meet_card', '242,140,40'],
  ['.veo-meet_pyramid', '242,140,40'],
  ['.product-stats_feature', 'accent'],
  ['.product-stats_row', 'accent'],
  ['.product-cap_card', 'accent'],
  ['.vpgo-pipeline_card', '46,158,94'],
  ['.vpgo-story_quote', '171,230,190'],
  ['.vso-timeline_card', '107,63,209'],
  ['.product-band_glass', 'accent'],
  ['.gap-life_card', '30,99,233'],
  ['.gap-use_card', '30,99,233'],
  ['.veo-trust_pillar', '242,140,40'],
  ['.veo-proof_peek', '242,140,40'],
  ['.v2-lab_card.is-veo', '242,140,40'],
  ['.v2-lab_card.is-vpgo', '46,158,94'],
  ['.v2-lab_card.is-vso', '107,63,209'],
  ['.v2-lab_card.is-mc', '88,165,251'],
  ['.v2-stat', '88,165,251'],
];
function glowCards() {
  for (const [sel, rgb] of GLOW) document.querySelectorAll(sel).forEach(el => {
    el.classList.add('gz-glow');
    let c = rgb === 'accent' ? ACCENT() : rgb;
    if (!c) { const ink = el.querySelector('.home-product_ink'); c = ink?.classList.contains('is-vpgo') ? '46,158,94' : ink?.classList.contains('is-vso') ? '107,63,209' : ink?.classList.contains('is-gap') ? '88,165,251' : '242,140,40'; }
    el.style.setProperty('--glow', c);
    el.addEventListener('pointermove', e => { const [x, y] = local(e, el); el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px'); });
  });
}

function nav() {
  const list = document.querySelector('.navbar_menu-list');
  if (!list) return;
  const pill = document.createElement('span'); pill.className = 'gz-nav-pill'; pill.setAttribute('aria-hidden', 'true');
  list.prepend(pill);
  let shown = false;
  list.querySelectorAll('.navbar_link').forEach(link => {
    link.addEventListener('pointerenter', () => {
      const lr = list.getBoundingClientRect(), r = link.getBoundingClientRect();
      const to = { x: r.left - lr.left, width: r.width, height: r.height, y: r.top - lr.top };
      if (!shown) { gsap.set(pill, to); gsap.to(pill, { opacity: 1, scale: 1, duration: .35, ease: 'power2.out' }); shown = true; }
      else gsap.to(pill, { ...to, duration: .45, ease: 'expo.out' });
    });
  });
  list.addEventListener('pointerleave', () => { shown = false; gsap.to(pill, { opacity: 0, scale: .9, duration: .35, ease: 'power2.out' }); });
}

// the logo stays still on hover (client tracker 19 Oct: no bounce)

export function initHovers() {
  injectFilter();
  buttons();
  if (!FINE) return;
  links(); glowCards(); nav();
}
