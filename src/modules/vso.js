// Virtual Stewardship Officer page: Jordan's thank-you in the hero (shared chat()), the year-round timeline,
// the four capability scenes and the retention turnaround.
// Every function is a no-op when its section is absent, so the module is safe on every page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { countTo } from './product.js';
import { REDUCED } from '../base.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const once = (trigger, start, fn) => ScrollTrigger.create({ trigger, start, once: true, onEnter: fn });
const X0 = 339, X1 = 1253;   // timeline axis in SVG units (Dec → Dec)

/* ---------- year-round timeline: one gift then silence, versus a year of touchpoints that ends in a renewal ---------- */
function timeline() {
  const stage = document.querySelector('.vso-timeline_stage'); if (!stage || REDUCED) return;
  const svg = stage.querySelector('.vso-timeline_svg'); if (!svg) return;
  const silence = svg.querySelector('.vso-timeline_silence'), year = svg.querySelector('.vso-timeline_year');
  const pulse = svg.querySelector('.vso-timeline_pulse'), months = svg.querySelectorAll('.vso-timeline_months text');
  const [sGift, sEnd] = svg.querySelectorAll('.vso-timeline_dots.is-silence circle');
  const yDots = [...svg.querySelectorAll('.vso-timeline_dots.is-year circle')];
  const chip = c => stage.querySelector('.vso-timeline_chip.' + c);
  const labels = stage.querySelectorAll('.vso-timeline_label'), glow = stage.querySelector('.vso-timeline_glow');
  const touch = ['is-t1', 'is-t2', 'is-t3', 'is-t4', 'is-t5', 'is-t6'].map(chip);
  const renewed = stage.querySelector('.vso-timeline_renewed');
  const pop = { scale: 0, transformOrigin: '50% 50%' };
  const chipIn = { opacity: 0, y: 8, filter: 'blur(6px)' };
  const chipTo = { opacity: 1, y: 0, filter: 'blur(0px)', duration: .6, ease: 'power3.out', clearProps: 'filter,transform' };

  const L = year.getTotalLength();
  gsap.set(year, { strokeDasharray: L, strokeDashoffset: L });
  gsap.set(silence, { scaleX: 0, transformOrigin: '0% 50%' });
  gsap.set([sGift, sEnd, ...yDots], pop);
  gsap.set([chip('is-gift1'), chip('is-lapsed'), chip('is-gift2'), ...touch].filter(Boolean), chipIn);
  if (renewed) gsap.set(renewed, { opacity: 0, scale: .6, filter: 'blur(6px)' });

  const tl = gsap.timeline({ paused: true });
  tl.from(labels, { opacity: 0, x: -12, filter: 'blur(8px)', duration: .8, stagger: .15, ease: 'power3.out', clearProps: 'filter,transform' }, 0)
    .from(months, { opacity: 0, duration: .5, stagger: .03 }, .1)
    // without stewardship: one gift, a long quiet line, and the donor fades out
    .to(sGift, { scale: 1, duration: .45, ease: 'back.out(3)' }, .35)
    .to(chip('is-gift1'), chipTo, .45)
    .to(silence, { scaleX: 1, duration: 1.8, ease: 'power1.inOut' }, .6)
    .to(sEnd, { scale: 1, duration: .4, ease: 'back.out(2)' }, 2.35)
    .to(chip('is-lapsed'), { ...chipTo, opacity: .75 }, 2.4);

  // with a VSO: the line draws through the year and every touchpoint lands as it passes
  const T = .9, D = 2.6, at = x => T + (x - X0) / (X1 - X0) * D;
  tl.to(yDots[0], { scale: 1, duration: .45, ease: 'back.out(3)' }, T - .1)
    .to(chip('is-gift2'), chipTo, T)
    .to(year, { strokeDashoffset: 0, duration: D, ease: 'none' }, T);
  // on narrow screens the card scrolls sideways; let the camera follow the year as it draws
  const card = stage.closest('.vso-timeline_card');
  if (card) tl.to(card, { scrollLeft: () => Math.max(0, card.scrollWidth - card.clientWidth), duration: D + .4, ease: 'power1.inOut' }, T + .2);
  yDots.slice(1).forEach((d, i) => {
    const t = at(+d.getAttribute('cx'));
    tl.to(d, { scale: 1, duration: .4, ease: 'back.out(3)' }, t);
    if (touch[i]) tl.to(touch[i], chipTo, t + .05);
  });
  if (renewed) tl.to(renewed, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .7, ease: 'back.out(2.2)', clearProps: 'filter,transform' }, T + D + .05)
    .add(() => renewed.classList.add('is-ping'), T + D + .4);

  // afterwards a soft pulse keeps travelling the connected year
  if (pulse) tl.add(() => {
    gsap.fromTo(pulse, { attr: { cx: X0 }, opacity: 0 }, {
      attr: { cx: X1 }, duration: 3.2, ease: 'sine.inOut', repeat: -1, repeatDelay: 1.4,
      keyframes: { opacity: [0, 1, 1, 0], easeEach: 'none' },
    });
  });
  if (glow) gsap.fromTo(glow, { yPercent: -4, scale: 1.05 }, { yPercent: 4, scale: 1, ease: 'none', scrollTrigger: { trigger: stage, start: 'top bottom', end: 'bottom top', scrub: true } });
  once(stage, 'top 75%', () => tl.play());
}

/* ---------- capabilities: each scene acts out what Jordan does ---------- */
function capabilities() {
  // the touchpoint bars carry their intensity in data-a; colour them even when motion is off
  document.querySelectorAll('.vso-cap_bar.is-on[data-a]').forEach(b => { b.style.backgroundColor = `rgba(107,63,209,${b.dataset.a})`; });
  if (REDUCED) return;
  const scene = (sel, fn) => { const el = document.querySelector(sel); if (el) { const tl = fn(el); once(el, 'top 82%', () => tl.play()); } };

  // 1 · stewardship at scale: three donors, three different stories, sent one after another
  scene('.vso-cap_list', el => {
    const rows = [...el.querySelectorAll('.vso-cap_donor')];
    const tl = gsap.timeline({ paused: true });
    tl.from(rows, { opacity: 0, x: -24, filter: 'blur(8px)', duration: .8, ease: 'expo.out', stagger: .14, clearProps: 'filter,transform' }, .15)
      .from(el.querySelectorAll('.vso-cap_segment'), { opacity: 0, scale: .7, duration: .5, ease: 'back.out(2.4)', stagger: .14, clearProps: 'transform' }, .55)
      .add(() => {
        let i = 0;
        const tick = () => { if (document.hidden) return; rows.forEach((r, j) => r.classList.toggle('is-sent', j === i)); i = (i + 1) % rows.length; };
        tick(); setInterval(tick, 2200);
      }, 1.4);
    return tl;
  });

  // 2 · impact update: the card develops, the photo fills in, the timing stamps last
  scene('.vso-cap_update', el => {
    const media = el.querySelector('.vso-cap_update-media');
    const tl = gsap.timeline({ paused: true });
    tl.from(el, { opacity: 0, y: 24, filter: 'blur(10px)', duration: 1, ease: 'power3.out', clearProps: 'filter,transform' }, .1)
      .fromTo(media, { clipPath: 'inset(0% 100% 0% 0% round .625rem)' }, { clipPath: 'inset(0% 0% 0% 0% round .625rem)', duration: 1.1, ease: 'power3.inOut', clearProps: 'clipPath' }, .35)
      .from([el.querySelector('.vso-cap_update-title'), el.querySelector('.vso-cap_update-org')], { opacity: 0, filter: 'blur(6px)', duration: .6, stagger: .1, clearProps: 'filter' }, .9)
      .from(el.querySelector('.vso-cap_update-when'), { opacity: 0, x: 10, duration: .5, ease: 'back.out(2)', clearProps: 'transform' }, 1.25);
    return tl;
  });

  // 3 · between cycles: the year fills month by month and the touchpoint count follows
  scene('.vso-cap_touch', el => {
    const bars = [...el.querySelectorAll('.vso-cap_bar')], count = el.querySelector('.vso-cap_touch-count');
    const tl = gsap.timeline({ paused: true });
    tl.from(el, { opacity: 0, filter: 'blur(8px)', duration: .8, ease: 'power2.out', clearProps: 'filter' }, .1)
      .from(bars, { scaleY: 0, transformOrigin: '50% 100%', duration: .55, ease: 'back.out(1.8)', stagger: .07, clearProps: 'transform' }, .35);
    if (count) {
      let n = 0; count.textContent = '0';
      bars.forEach((b, i) => { if (b.classList.contains('is-on')) tl.add(() => { count.textContent = String(++n); }, .35 + i * .07 + .3); });
    }
    return tl;
  });

  // 4 · renew: an invitation and a one-click renewal are dealt onto the table
  scene('.vso-cap_offers', el => {
    const [a, b] = el.querySelectorAll('.vso-cap_offer');
    const tl = gsap.timeline({ paused: true });
    tl.from(a, { opacity: 0, rotate: -8, y: 30, filter: 'blur(8px)', duration: 1, ease: 'expo.out', clearProps: 'filter,transform' }, .15)
      .from(b, { opacity: 0, rotate: 8, y: 30, filter: 'blur(8px)', duration: 1, ease: 'expo.out', clearProps: 'filter,transform' }, .35)
      .from(el.querySelectorAll('.vso-cap_offer-btn'), { opacity: 0, scale: .6, duration: .5, ease: 'back.out(2.4)', stagger: .15, clearProps: 'transform' }, .9);
    return tl;
  });
}

/* ---------- retention: 71% counts up, the curve dips and turns when the VSO starts ---------- */
function risk() {
  const card = document.querySelector('.product-band_card'); if (!card || REDUCED) return;
  const glass = card.querySelector('.product-band_glass'), num = card.querySelector('.product-band_number'), ink = card.querySelector('.product-band_ink');
  const svg = card.querySelector('.product-band_svg'), line = svg?.querySelector('.vso-risk_line'), dot = svg?.querySelector('.vso-risk_dot');
  const marker = card.querySelector('.product-band_marker');
  if (num) countTo(num, { duration: 2, trigger: card, start: 'top 65%' });
  if (ink) gsap.fromTo(ink, { scale: 1.12, yPercent: -4 }, { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  const tl = gsap.timeline({ paused: true });
  if (glass) tl.from(glass, { opacity: 0, filter: 'blur(14px)', duration: 1.2, ease: 'power3.out', clearProps: 'filter' }, .2);
  if (line) {
    line.removeAttribute('vector-effect');   // dash lengths must be in path units
    const L = line.getTotalLength();
    gsap.set(line, { strokeDasharray: L, strokeDashoffset: L });
    gsap.set(dot, { scale: 0, transformOrigin: '50% 50%' });
    if (marker) gsap.set(marker, { opacity: 0, y: 4 });
    // the line falls to the dot (≈46% of its length) slowly, then climbs back faster
    tl.to(line, { strokeDashoffset: L * .54, duration: 1.2, ease: 'power1.in' }, .8)
      .to(dot, { scale: 1, duration: .45, ease: 'back.out(3)' }, 1.95)
      .to(marker, { opacity: 1, y: 0, duration: .5, ease: 'power2.out' }, 2.05)
      .to(line, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out' }, 2.05)
      .add(() => {
        const ring = document.createElementNS(SVGNS, 'circle');
        ring.setAttribute('class', 'vso-risk_ring');
        ['cx', 'cy'].forEach(a => ring.setAttribute(a, dot.getAttribute(a)));
        ring.setAttribute('r', '6'); ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#B69BF2'); ring.setAttribute('stroke-width', '1.5');
        dot.before(ring);
        gsap.fromTo(ring, { attr: { r: 6 }, opacity: .8 }, { attr: { r: 18 }, opacity: 0, duration: 2.2, ease: 'power2.out', repeat: -1, repeatDelay: .6 });
      }, 2.4);
  }
  once(card, 'top 65%', () => tl.play());
}

export function initVso() {
  if (!document.querySelector('.product-hero_visual.is-vso')) return;
  for (const fn of [timeline, capabilities, risk]) {
    try { fn(); } catch (e) { console.error('[givzey] vso', fn.name, e); }
  }
}
