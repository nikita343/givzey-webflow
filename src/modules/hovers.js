// Hovers: ink and light, never the usual "lift a few pixels".
//  - buttons: an ink blot spreads from where the cursor enters (wobbly edge via SVG turbulence) and the glow deepens
//  - text links: a brush-stroke underline writes itself in, and wipes out the way the cursor leaves
//  - cards: a light follows the cursor along the border and pools softly inside, tinted per product
//  - nav: one liquid highlight glides between items
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

const BRUSH = `<svg viewBox="0 0 200 10" preserveAspectRatio="none" aria-hidden="true"><path d="M2 6.2C24 4.4 41 7.6 63 5.6S104 3.9 127 5.4 171 7.3 198 4.6" pathLength="1"/></svg>`;
function links() {
  document.querySelectorAll('.home-product_link, .home-story_link, .footer_link, .footer_legal-link, .footer_email').forEach(a => {
    if (a.querySelector('.gz-underline')) return;
    const u = document.createElement('span'); u.className = 'gz-underline'; u.innerHTML = BRUSH; a.appendChild(u);
    const path = u.querySelector('path');
    gsap.set(path, { strokeDasharray: 1, strokeDashoffset: 1 });
    a.addEventListener('pointerenter', () => gsap.fromTo(path, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: .55, ease: 'power2.out', overwrite: true }));
    a.addEventListener('pointerleave', () => gsap.to(path, { strokeDashoffset: -1, duration: .45, ease: 'power2.in', overwrite: true }));
    a.addEventListener('focus', () => gsap.to(path, { strokeDashoffset: 0, duration: .4 }));
    a.addEventListener('blur', () => gsap.to(path, { strokeDashoffset: 1, duration: .3 }));
  });
}

const GLOW = [
  ['.home-product_visual', null],
  ['.home-stats_card', '88,165,251'],
  ['.home-testimonials_logo-card', '88,165,251'],
  ['.cta_component', '88,165,251'],
  ['.home-story_inner', '171,230,255'],
];
function glowCards() {
  for (const [sel, rgb] of GLOW) document.querySelectorAll(sel).forEach(el => {
    el.classList.add('gz-glow');
    let c = rgb;
    if (!c) { const ink = el.querySelector('.home-product_ink'); c = ink?.classList.contains('is-vpgo') ? '46,158,94' : ink?.classList.contains('is-vso') ? '107,63,209' : '242,140,40'; }
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

function footerLogo() {
  const logo = document.querySelector('.footer_logo-link svg, .navbar_logo-link svg');
  document.querySelectorAll('.footer_logo-link, .navbar_logo-link').forEach(a => {
    const drops = a.querySelectorAll('svg > g:first-of-type path');
    if (!drops.length) return;
    gsap.set(drops, { transformOrigin: '50% 50%' });
    a.addEventListener('pointerenter', () => gsap.fromTo(drops, { scale: .6 }, { scale: 1, duration: .9, ease: 'elastic.out(1.2,.4)', stagger: .06, overwrite: true }));
  });
  return logo;
}

export function initHovers() {
  injectFilter();
  buttons();
  if (!FINE) return;
  links(); glowCards(); nav(); footerLogo();
}
