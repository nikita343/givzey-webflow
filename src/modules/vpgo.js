// Virtual Planned Giving Officer page: Grace's conversation in the hero, the hidden-pipeline iceberg,
// the rising bequest curve, the six capability scenes and the La Salle story.
// Every function is a no-op when its section is absent, so the module is safe on every page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { countTo } from './product.js';
import { REDUCED } from '../base.js';

const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const SVGNS = 'http://www.w3.org/2000/svg';
const once = (trigger, start, fn) => ScrollTrigger.create({ trigger, start, once: true, onEnter: fn });
const develop = { opacity: 0, filter: 'blur(10px)' };

/* ---------- hidden pipeline: the tip shows, the water clears, the VPGO finds what sits below ---------- */
const BERG = [[581, 214], [761, 214], [851, 299], [896, 419], [831, 544], [651, 584], [501, 529], [461, 399], [521, 289]];
function inside(x, y, poly = BERG) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function pipeline() {
  const card = document.querySelector('.vpgo-pipeline_card'); if (!card) return;
  const svg = card.querySelector('.vpgo-berg');
  // the undisclosed prospects: a dot grid inside the submerged part (built here to keep the embed small)
  const grid = svg?.querySelector('.vpgo-berg_grid');
  const dots = [];
  if (grid) {
    const g = document.createElementNS(SVGNS, 'g'); g.setAttribute('class', 'vpgo-berg_dots'); g.setAttribute('fill', '#030B2C'); g.setAttribute('fill-opacity', '.18');
    for (let y = 236; y <= 578; y += 18) for (let x = 471; x <= 885; x += 18) {
      if (!inside(x, y)) continue;
      const c = document.createElementNS(SVGNS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 2); g.appendChild(c); dots.push(c);
    }
    grid.replaceWith(g);
  }
  if (!svg || REDUCED) return;
  const tip = svg.querySelector('.vpgo-berg_tip'), body = svg.querySelector('.vpgo-berg_body');
  const wave = svg.querySelector('.vpgo-berg_wave'), stars = svg.querySelectorAll('.vpgo-berg_stars circle');
  const trails = [...svg.querySelectorAll('.vpgo-berg_trail')], tops = svg.querySelectorAll('.vpgo-berg_tops circle'), nodes = [...svg.querySelectorAll('.vpgo-berg_node')];
  const chips = [...card.querySelectorAll('.vpgo-pipeline_chip')];   // Bequest (trail 1), IRA (trail 2), Estate (trail 3)
  const legend = card.querySelectorAll('.vpgo-pipeline_key'), proof = card.querySelector('.vpgo-pipeline_proof');
  const sea = card.querySelector('.vpgo-pipeline_sea'), label = card.querySelector('.vpgo-pipeline_waterlabel');
  const proofTitle = proof?.querySelector('.vpgo-pipeline_proof-title');

  gsap.set(trails, { transformOrigin: '50% 0%', scaleY: 0 });
  gsap.set(nodes, { transformOrigin: '50% 50%', scale: 0 });
  gsap.set(tops, { transformOrigin: '50% 50%', scale: 0 });
  gsap.set(chips, { opacity: 0, x: -8, filter: 'blur(6px)' });
  gsap.set(dots, { opacity: 0 });

  const tl = gsap.timeline({ paused: true });
  tl.from(card, { opacity: 0, filter: 'blur(14px)', duration: 1.1, ease: 'power3.out', clearProps: 'filter' }, 0)
    .from(sea, { opacity: 0, yPercent: 8, duration: 2, ease: 'power2.out' }, .1)
    .from(legend, { opacity: 0, filter: 'blur(6px)', duration: .8, stagger: .1, ease: 'power2.out', clearProps: 'filter' }, .3)
    .from(tip, { opacity: 0, y: -26, duration: 1.1, ease: 'expo.out' }, .35)
    .from(stars, { opacity: 0, duration: .5, stagger: .07 }, .9)
    // the submerged part develops from the waterline down, then its prospects light up from the centre
    .fromTo(body, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'power3.inOut', clearProps: 'clipPath' }, .7)
    .to(dots, { opacity: 1, duration: .4, ease: 'power1.out', stagger: { each: .006, from: [0.45, 0], grid: 'auto' } }, 1.1)
    .from(label, { opacity: 0, duration: .8 }, 1);
  // the VPGO dives three times; each find comes back up as a chip
  [0, 1, 2].forEach(i => {
    const at = 1.9 + i * .38;
    tl.to(tops[i], { scale: 1, duration: .4, ease: 'back.out(3)' }, at)
      .to(trails[i], { scaleY: 1, duration: .75, ease: 'power2.inOut' }, at + .1)
      .to(nodes[i], { scale: 1, duration: .55, ease: 'back.out(2.6)' }, at + .78)
      .to(chips[i], { opacity: 1, x: 0, filter: 'blur(0px)', duration: .7, ease: 'power3.out', clearProps: 'filter' }, at + .85);
  });
  if (proof) tl.from(proof, { opacity: 0, filter: 'blur(10px)', scale: .95, transformOrigin: '0% 50%', duration: .9, ease: 'expo.out', clearProps: 'filter,scale' }, 3.2);
  if (proofTitle) {
    const raw = proofTitle.textContent, o = { v: 0 };
    tl.add(() => { proofTitle.textContent = raw.replace('$100,000', '$0'); }, 0)
      .to(o, { v: 100000, duration: 1.4, ease: 'power3.out', onUpdate: () => { proofTitle.textContent = raw.replace('$100,000', '$' + Math.round(o.v).toLocaleString('en-US')); } }, 3.3);
  }
  tl.add(() => {
    // the water keeps moving, the berg breathes, found intent keeps glowing
    gsap.to([tip, body], { y: 3, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    gsap.to(nodes, { scale: 1.25, duration: 1.3, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: .4 });
    gsap.to(stars, { opacity: .35, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: .3, from: 'random' } });
  });
  if (wave) gsap.to(wave, { x: 48, duration: 3.4, ease: 'none', repeat: -1 });
  once(card, 'top 72%', () => tl.play());

  // pointing at a find lights its trail
  chips.forEach((chip, i) => {
    chip.style.pointerEvents = 'auto';
    chip.addEventListener('pointerenter', () => { gsap.to(trails[i], { attr: { 'stroke-width': 3 }, duration: .3 }); chip.classList.add('is-hot'); });
    chip.addEventListener('pointerleave', () => { gsap.to(trails[i], { attr: { 'stroke-width': 2 }, duration: .4 }); chip.classList.remove('is-hot'); });
  });
}

/* ---------- featured stat: bequest giving rises along the curve ---------- */
function curve() {
  const box = document.querySelector('.vpgo-stats_curve'); if (!box || REDUCED) return;
  const line = box.querySelector('.vpgo-curve_line'), area = box.querySelector('.vpgo-curve_area'), dot = box.querySelector('.vpgo-stats_dot');
  if (!line) return;
  const L = line.getTotalLength();
  gsap.set(line, { strokeDasharray: L, strokeDashoffset: L });
  gsap.set(dot, { scale: 0 });
  const tl = gsap.timeline({ paused: true });
  tl.to(line, { strokeDashoffset: 0, duration: 1.9, ease: 'power2.inOut' }, .35)
    .fromTo(area, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.9, ease: 'power2.inOut' }, .35)
    .to(dot, { scale: 1, duration: .5, ease: 'back.out(3)' }, 2.1)
    .add(() => dot.classList.add('is-ping'));
  once(box, 'top 90%', () => tl.play());
}

/* ---------- capabilities: each scene acts out what Grace does ---------- */
function capabilities() {
  if (REDUCED) return;

  const scene = (sel, fn) => { const el = document.querySelector(sel); if (el) { const tl = fn(el); once(el, 'top 82%', () => tl.play()); } };

  // 1 · gift vehicles: chips arrive, then the highlight hops from vehicle to vehicle
  scene('.vpgo-cap_cloud', el => {
    const chips = [...el.querySelectorAll('.vpgo-cap_vehicle')];
    const tl = gsap.timeline({ paused: true });
    tl.from(chips, { opacity: 0, scale: .8, filter: 'blur(8px)', duration: .7, ease: 'back.out(1.8)', stagger: { each: .07, from: 'center' }, clearProps: 'filter,scale' }, .2);
    tl.add(() => {
      let i = chips.findIndex(c => c.classList.contains('is-active'));
      setInterval(() => {
        if (document.hidden) return;
        chips[i]?.classList.remove('is-active');
        i = (i + 1 + Math.floor(Math.random() * (chips.length - 1))) % chips.length;
        chips[i].classList.add('is-active');
      }, 1900);
    }, 1.6);
    return tl;
  });

  // 2 · intention → commitment: the boxes tick, the last one gets signed, the badge stamps
  scene('.vpgo-cap_intent', el => {
    const rows = el.querySelectorAll('.vpgo-cap_check-row'), boxes = el.querySelectorAll('.vpgo-cap_box');
    const last = boxes[boxes.length - 1], label = rows[rows.length - 1]?.querySelector('.vpgo-cap_check-label');
    const badge = el.querySelector('.vpgo-cap_badge');
    const tl = gsap.timeline({ paused: true });
    tl.from(el, { opacity: 0, filter: 'blur(8px)', duration: .8, ease: 'power2.out', clearProps: 'filter' }, .1)
      .from(rows, { opacity: 0, x: -8, duration: .5, ease: 'power2.out', stagger: .14 }, .3);
    [...boxes].slice(0, -1).forEach((b, i) => tl.from(b, { scale: 0, duration: .45, ease: 'back.out(2.4)' }, .55 + i * .3));
    if (badge) gsap.set(badge, { opacity: 0, scale: 1.4, rotate: -6 });
    tl.add(() => { last?.classList.remove('is-empty'); label?.classList.remove('is-muted'); last?.classList.add('is-ticked'); }, 1.6)
      .fromTo(last, { scale: .4 }, { scale: 1, duration: .5, ease: 'back.out(2.6)' }, 1.6);
    if (badge) tl.to(badge, { opacity: 1, scale: 1, rotate: 0, duration: .55, ease: 'back.out(2)' }, 1.95);
    return tl;
  });

  // 3 · campaigns: two calendar cards are dealt onto the table
  scene('.vpgo-cap_campaigns', el => {
    const [a, b] = el.querySelectorAll('.vpgo-cap_campaign');
    const tl = gsap.timeline({ paused: true });
    tl.from(a, { opacity: 0, rotate: -14, x: -40, filter: 'blur(8px)', duration: 1, ease: 'expo.out', clearProps: 'filter' }, .15)
      .from(b, { opacity: 0, rotate: 14, x: 40, filter: 'blur(8px)', duration: 1, ease: 'expo.out', clearProps: 'filter' }, .35)
      .from(el.querySelectorAll('.vpgo-cap_month'), { opacity: 0, scale: .6, duration: .5, ease: 'back.out(2.4)', stagger: .2 }, .8);
    return tl;
  });

  // 4 · QCD timing: the year runs towards the deadline, months light up as it passes
  scene('.vpgo-cap_qcd', el => {
    const fill = el.querySelector('.vpgo-cap_fill'), months = [...el.querySelectorAll('.vpgo-cap_months > *')], date = el.querySelector('.vpgo-cap_qcd-date');
    const tl = gsap.timeline({ paused: true });
    tl.from(el, { opacity: 0, filter: 'blur(8px)', duration: .8, ease: 'power2.out', clearProps: 'filter' }, .1)
      .fromTo(fill, { width: '0%' }, { width: '75.76%', duration: 1.8, ease: 'power2.inOut' }, .4);
    months.forEach((m, i) => tl.add(() => m.classList.add('is-past'), .45 + Math.min(i / 3, .99) * 1.8 * (i < 3 ? 1 : 1.2)));
    if (date) tl.add(() => date.classList.add('is-ping'), 2.2);
    return tl;
  });

  // 5 · society: the seal is pressed, Richard's welcome slides out from behind it
  scene('.vpgo-cap_society', el => {
    const seal = el.querySelector('.vpgo-cap_seal'), welcome = el.querySelector('.vpgo-cap_welcome');
    const tl = gsap.timeline({ paused: true });
    tl.from(seal, { scale: .6, opacity: 0, rotate: -20, duration: .9, ease: 'back.out(1.8)' }, .15)
      .add(() => seal?.classList.add('is-ping'), .7)
      .from(welcome, { x: -60, opacity: 0, filter: 'blur(8px)', duration: .9, ease: 'expo.out', clearProps: 'filter' }, .75);
    return tl;
  });

  // 6 · handoff: the confirmed gift travels down to a person and to stewardship
  scene('.vpgo-cap_handoff', el => {
    const agent = el.querySelector('.vpgo-cap_agent'), down = el.querySelector('.vpgo-cap_down'), dests = el.querySelectorAll('.vpgo-cap_dest');
    const spark = document.createElement('span'); spark.className = 'vpgo-cap_spark'; spark.setAttribute('aria-hidden', 'true'); el.appendChild(spark);
    const tl = gsap.timeline({ paused: true });
    tl.from(agent, { opacity: 0, filter: 'blur(8px)', duration: .8, ease: 'power2.out', clearProps: 'filter' }, .1)
      .from(down, { opacity: 0, y: -6, duration: .5 }, .6)
      .fromTo(spark, { top: '2.6rem', opacity: 0, scale: .5 }, { top: '5.4rem', opacity: 1, scale: 1, duration: .55, ease: 'power2.in' }, .75)
      .to(spark, { opacity: 0, scale: 2.4, duration: .45, ease: 'power2.out' }, 1.3)
      .from(dests, { opacity: 0, y: 10, filter: 'blur(8px)', duration: .7, ease: 'power3.out', stagger: .12, clearProps: 'filter' }, 1.25);
    return tl;
  });
}

/* ---------- La Salle: the gift counts up, the campus drifts behind the glass ---------- */
function story() {
  const card = document.querySelector('.vpgo-story_card'); if (!card) return;
  const num = card.querySelector('.vpgo-story_number'), photo = card.querySelector('.vpgo-story_photo');
  const quote = card.querySelector('.vpgo-story_quote'), link = card.querySelector('.vpgo-story_link');
  if (REDUCED) return;
  if (num) countTo(num, { duration: 2.2, trigger: card, start: 'top 70%' });
  if (photo) gsap.fromTo(photo, { scale: 1.12, yPercent: -3 }, { scale: 1, yPercent: 3, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  const tl = gsap.timeline({ paused: true });
  if (quote) tl.from(quote, { opacity: 0, filter: 'blur(14px)', duration: 1.2, ease: 'power3.out', clearProps: 'filter' }, .3)
    .from(quote.children, { opacity: 0, filter: 'blur(6px)', duration: .8, stagger: .12, ease: 'power2.out', clearProps: 'filter' }, .5);
  if (link) tl.from(link, { opacity: 0, filter: 'blur(8px)', duration: .9, ease: 'power2.out', clearProps: 'filter' }, .6);
  once(card, 'top 70%', () => tl.play());
}

export function initVpgo() {
  if (!document.querySelector('.product-hero_visual.is-vpgo')) return;
  for (const fn of [pipeline, curve, capabilities, story]) {
    try { fn(); } catch (e) { console.error('[givzey] vpgo', fn.name, e); }
  }
}
