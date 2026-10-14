// Version2 (the lab): hero copy bleeds in while the white-fluid plate opens and its inks bloom,
// beliefs write themselves row by row, lab cards bloom their one-colour ink from the corner
// (the cursor stirs it), and the results count up. No-op unless `.section_v2-hero` exists.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { inkLayer } from './ink-layer.js';
import { headingBleed, fadeCopy, unrollTag } from './reveal.js';
import { countTo } from './product.js';
import { initWaterHero } from './ink-water.js';
import { REDUCED } from '../base.js';

function hero() {
  const sec = document.querySelector('.section_v2-hero');
  const plate = document.querySelector('.v2-plate_card');
  const inks = plate ? [...plate.querySelectorAll('.v2-plate_img')].map((img, i) =>
    inkLayer(img, { host: plate, origin: i ? [1, 0] : [0, 1], seed: 3.1 + i * 2.4 })) : [];
  if (REDUCED) { inks.forEach(l => l.setReveal(1)); return; }

  const tl = gsap.timeline({ delay: .05 });
  const nav = document.querySelector('.navbar_component');
  if (nav) tl.from(nav, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter,opacity' }, 0);
  const tag = sec.querySelector('.tag'), h1 = sec.querySelector('h1');
  const text = sec.querySelector('.v2-hero_text'), btn = sec.querySelector('.v2-hero_actions');
  if (tag) tl.add(unrollTag(tag, { trigger: null }).play(), .05);
  if (h1) tl.add(headingBleed(h1, { trigger: null }).play(), .12);
  if (text) tl.add(fadeCopy(text, { trigger: null }).play(), .55);
  if (btn) tl.from(btn, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter' }, .72);
  if (!plate) return;
  // the plate opens like a lens, the two whites spread from opposite corners, then the label settles
  tl.fromTo(plate, { clipPath: 'inset(8% 6% 8% 6% round 3rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 2rem)', duration: 1.6, ease: 'expo.out', clearProps: 'clipPath' }, .3);
  inks.forEach((l, i) => { const o = { r: 0 }; tl.to(o, { r: 1, duration: 3, ease: 'power2.out', onUpdate: () => l.setReveal(o.r) }, .4 + i * .35); });
  const label = plate.querySelector('.v2-plate_label'), dot = plate.querySelector('.v2-dot');
  if (label) tl.from(label, { opacity: 0, scale: .9, filter: 'blur(8px)', duration: .9, ease: 'back.out(1.6)', clearProps: 'filter,scale' }, 1);
  // the dot keeps a slow pulse: the lab is "on"
  if (dot) tl.add(() => gsap.to(dot, { boxShadow: '0 0 0 .45rem rgba(4,92,232,0)', startAt: { boxShadow: '0 0 0 0 rgba(4,92,232,.45)' }, duration: 1.8, ease: 'power2.out', repeat: -1, repeatDelay: .6 }), 1.6);
}

function beliefs() {
  const rows = gsap.utils.toArray('.v2-belief'); if (!rows.length || REDUCED) return;
  rows.forEach(row => {
    const num = row.querySelector('.v2-belief_num'), text = row.querySelector('.v2-belief_text');
    const tl = gsap.timeline({ paused: true });
    // the rule under each row draws left → right, the number arrives, the statement bleeds in
    tl.fromTo(row, { '--line': 0 }, { '--line': 1, duration: 1.2, ease: 'expo.out' }, 0);
    if (num) tl.from(num, { opacity: 0, x: -12, filter: 'blur(6px)', duration: .8, ease: 'power3.out', clearProps: 'filter' }, .05);
    if (text) tl.add(headingBleed(text, { trigger: null }).play(), .1);
    ScrollTrigger.create({ trigger: row, start: 'top 88%', once: true, onEnter: () => tl.play() });
  });
}

function lab() {
  const cards = gsap.utils.toArray('.v2-lab_card'); if (!cards.length) return;
  const layers = cards.map((card, i) => {
    const img = card.querySelector('.v2-lab_img');
    return img ? inkLayer(img, { host: card, origin: [1, 1], seed: 6 + i * 1.7 }) : null;
  });
  if (REDUCED) { layers.forEach(l => l?.setReveal(1)); return; }
  cards.forEach((card, i) => {
    const l = layers[i], tl = gsap.timeline({ paused: true });
    tl.from(card, { opacity: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', clearProps: 'filter' }, (i % 2) * .12);
    if (l) { const o = { r: 0 }; tl.to(o, { r: 1, duration: 2.6, ease: 'power2.out', onUpdate: () => l.setReveal(o.r) }, .15 + (i % 2) * .12); }
    const tag = card.querySelector('.tag'), link = card.querySelector('.v2-link');
    const title = card.querySelector('.v2-lab_title'), text = card.querySelector('.v2-lab_text');
    if (tag) tl.add(unrollTag(tag, { trigger: null }).play(), .25 + (i % 2) * .12);
    if (title) tl.add(headingBleed(title, { trigger: null }).play(), .3 + (i % 2) * .12);
    if (text) tl.add(fadeCopy(text, { trigger: null }).play(), .45 + (i % 2) * .12);
    if (link) tl.from(link, { opacity: 0, filter: 'blur(6px)', duration: .8, ease: 'power2.out', clearProps: 'filter' }, .6 + (i % 2) * .12);
    ScrollTrigger.create({ trigger: card, start: 'top 85%', once: true, onEnter: () => tl.play() });
  });
}

function stats() {
  const cards = gsap.utils.toArray('.v2-stat'); if (!cards.length || REDUCED) return;
  const grid = document.querySelector('.v2-stats_grid');
  const tl = gsap.timeline({ paused: true });
  tl.from(cards, { opacity: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', stagger: .1, clearProps: 'filter' }, 0);
  cards.forEach((c, i) => {
    const n = c.querySelector('.v2-stat_number'), dot = c.querySelector('.v2-dot');
    if (n) tl.add(() => countTo(n, { trigger: null, duration: 2 + (i ? 0 : .4) }), .1 + i * .1);
    if (dot) tl.from(dot, { scale: 0, duration: .6, ease: 'back.out(3)' }, .2 + i * .1);
  });
  ScrollTrigger.create({ trigger: grid, start: 'top 85%', once: true, onEnter: () => tl.play() });
}

/* ---------- Version2 R2 (.v2r-*): the live hero ---------- */
// the hero becomes deep water in the one brand blue (the homepage engine, held on blue), the headline bleeds in,
// the copy and button develop, the four results count up along a hairline that draws across
function heroR(sec) {
  const water = initWaterHero(sec, { inkSel: '.v2r-none', wrapSel: null, calmSel: '.v2r-h1', avoidSel: '.v2r-row, .v2r-stats',
    palette: 0, paper: '#061650', deep: ['#05124A', '#0A2B8C'], prepend: true, main: false });
  if (water.ok && !REDUCED) water.ready.then(() => [[.86, .7, 1.1], [.93, .48, .8], [.74, .82, .7]].forEach(([x, y, size], i) =>
    setTimeout(() => water.drip(x, y, { size, fall: .8 }), 500 + i * 650)));
  if (REDUCED) return;
  const h1 = sec.querySelector('.v2r-h1'), sub = sec.querySelector('.v2r-sub'), btn = sec.querySelector('.v2r-row .dm-btn');
  const statsBox = sec.querySelector('.v2r-stats'), cards = gsap.utils.toArray(sec.querySelectorAll('.v2r-stat'));
  const nav = document.querySelector('.navbar_component');
  const tl = gsap.timeline({ delay: .05 });
  if (nav) tl.from(nav, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter,opacity' }, 0);
  if (h1) tl.add(headingBleed(h1, { trigger: null, light: true }).play(), .1);
  if (sub) tl.add(fadeCopy(sub, { trigger: null }).play(), .55);
  if (btn) tl.from(btn, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter' }, .7);
  if (statsBox) tl.fromTo(statsBox, { '--gz-line': 0 }, { '--gz-line': 1, duration: 1.6, ease: 'expo.out' }, .8);
  cards.forEach((c, i) => {
    tl.from(c, { opacity: 0, y: 16, filter: 'blur(10px)', duration: 1, ease: 'power3.out', clearProps: 'filter,transform' }, .9 + i * .1);
    const n = c.querySelector('.v2r-num'); if (n) tl.add(() => countTo(n, { trigger: null, duration: 2 })?.play(), .95 + i * .1);
    const ico = c.querySelector('.sol-icon'); if (ico) tl.from(ico, { scale: .5, opacity: 0, duration: .7, ease: 'back.out(2.2)', clearProps: 'transform,opacity' }, 1 + i * .1);
  });
  [h1, sub, btn, ...cards].forEach(e => e && (e.dataset.gzMotion = '1'));
  sec.querySelectorAll('.v2r-num, .v2r-label, .sol-icon').forEach(e => (e.dataset.gzMotion = '1'));
}

export function initV2() {
  const r2 = document.querySelector('.v2r-hero');
  if (r2) { heroR(r2); return; }
  if (!document.querySelector('.section_v2-hero')) return;
  hero(); beliefs(); lab(); stats();
}
