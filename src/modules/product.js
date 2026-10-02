// Product pages (built for the Virtual Engagement Officer, reusable for VPGO / VSO):
// hero channel stack, donor pyramid, featured stat meter, capabilities grid, trust pillars,
// customer-proof carousel and the FAQ accordion. Every function is a no-op when its section is absent.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { Flip } from 'gsap/Flip';
import { inkLayer } from './ink-layer.js';
import { headingBleed, fadeCopy, unrollTag } from './reveal.js';
import { REDUCED } from '../base.js';

gsap.registerPlugin(Flip);
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const MOBILE = matchMedia('(max-width: 767px)');

// "43%", "1,000", "0.07%", "4x", "$1M+": count the number, keep prefix / suffix / thousands separators
export function countTo(el, { duration = 1.8, trigger = el, start = 'top 85%', delay = 0 } = {}) {
  const raw = el.textContent.trim();
  const m = raw.match(/^([^\d]*)(\d[\d,]*\.?\d*)(.*)$/); if (!m) return null;
  const [, pre, num, post] = m, comma = num.includes(','), clean = num.replace(/,/g, '');
  const target = parseFloat(clean), dec = (clean.split('.')[1] || '').length;
  const fmt = v => pre + (comma ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec)) + post;
  const o = { v: 0 }; el.textContent = fmt(0);
  const tw = gsap.to(o, { v: target, duration, delay, ease: 'power3.out', paused: !!trigger,
    onUpdate: () => { el.textContent = fmt(o.v); }, onComplete: () => { el.textContent = raw; } });
  if (trigger) ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tw.play() });
  return tw;
}

/* ---------- hero: copy bleeds in, the ink blooms, the channel cards unfold like a week of outreach ---------- */
function hero() {
  const sec = document.querySelector('.section_product-hero'); if (!sec) return;
  const content = sec.querySelector('.product-hero_content'), visual = sec.querySelector('.product-hero_visual');
  const ink = visual?.querySelector('.product-hero_ink');
  const layer = ink ? inkLayer(ink, { host: visual, origin: [1, 0], seed: 4.2 }) : null;
  const cards = visual ? [...visual.querySelectorAll('.product-hero_card')] : [];
  const order = cards.slice().reverse();   // DOM is back→front; the newest touchpoint (front) leads
  if (cards.length) gsap.set(cards, { xPercent: -50, x: 0 });   // GSAP owns the centring, so parallax never fights the CSS translate
  visual?.classList.add('is-live');
  if (REDUCED) { layer?.setReveal(1); return; }

  const tl = gsap.timeline({ delay: .05 });
  const nav = document.querySelector('.navbar_component');
  if (nav) tl.from(nav, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter,opacity' }, 0);
  const tag = content?.querySelector('.tag'), h1 = content?.querySelector('h1');
  const text = content?.querySelector('.product-hero_text'), btns = content?.querySelector('.product-hero_buttons');
  if (tag) tl.add(unrollTag(tag, { trigger: null }).play(), .05);
  if (h1) tl.add(headingBleed(h1, { trigger: null }).play(), .12);
  if (text) tl.add(fadeCopy(text, { trigger: null }).play(), .5);
  if (btns) tl.from(btns, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter' }, .68);
  if (visual) {
    tl.fromTo(visual, { clipPath: 'inset(7% 7% 7% 7% round 3rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 2rem)', duration: 1.5, ease: 'expo.out', clearProps: 'clipPath' }, .1);
    if (layer) { const o = { r: 0 }; tl.to(o, { r: 1, duration: 2.8, ease: 'power2.out', onUpdate: () => layer.setReveal(o.r) }, .25); }
    const label = visual.querySelector('.product-hero_label'), arrow = visual.querySelector('.product-hero_label-arrow');
    if (label) tl.from(label, { opacity: 0, scale: .9, filter: 'blur(8px)', transformOrigin: '0% 50%', duration: .9, ease: 'back.out(1.6)', clearProps: 'filter,scale' }, .55);
    if (arrow) tl.from(arrow, { opacity: 0, scale: .6, rotate: -90, duration: .9, ease: 'back.out(1.8)' }, .7);
    const front = order[0];
    order.forEach((c, i) => {
      const s = gsap.getProperty(c, 'scale'), op = parseFloat(getComputedStyle(c).opacity) || 1;
      const dy = i ? front.offsetTop - c.offsetTop : 28;
      tl.fromTo(c, { y: dy, scale: s * .94, opacity: 0, filter: 'blur(6px)' },
        { y: 0, scale: s, opacity: op, filter: 'blur(0px)', duration: 1.05, ease: 'expo.out', clearProps: 'filter' }, .8 + i * .2);
    });
  }
  if (!FINE || !visual) return;
  // the stack floats with the cursor; nearer (bigger) cards travel further
  tl.then(() => {
    const qs = order.map((c, i) => { const d = 1 - i * .22; return [gsap.quickTo(c, 'x', { duration: .9, ease: 'power3' }), gsap.quickTo(c, 'y', { duration: .9, ease: 'power3' }), d]; });
    visual.addEventListener('pointermove', e => {
      const r = visual.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
      qs.forEach(([qx, qy, d]) => { qx(nx * 18 * d); qy(ny * 12 * d); });
    });
    visual.addEventListener('pointerleave', () => qs.forEach(([qx, qy]) => { qx(0); qy(0); }));
  });
}

/* ---------- donor pyramid: built from the base up, the VEO tier glows, dots light up row by row ---------- */
function pyramid() {
  const box = document.querySelector('.veo-meet_pyramid'); if (!box) return;
  const svg = box.querySelector('svg'); if (!svg || REDUCED) return;
  const tiers = [...svg.querySelectorAll('.veo-pyramid_tier')];   // frontline, VEO, everyone else
  const glow = svg.querySelector('.veo-pyramid_glow');
  const links = [...svg.querySelectorAll('.veo-pyramid_links path')], nodes = svg.querySelectorAll('.veo-pyramid_nodes circle');
  const pills = box.querySelectorAll('.veo-pyramid_pill'), notes = box.querySelectorAll('.veo-pyramid_note'), cap = box.querySelector('.veo-pyramid_caption');
  links.forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 300; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  const tl = gsap.timeline({ paused: true });
  if (cap) tl.from(cap, { opacity: 0, filter: 'blur(8px)', duration: .8, ease: 'power2.out' }, 0);
  [2, 1, 0].forEach((k, i) => {
    const t = tiers[k]; if (!t) return;
    const shape = t.querySelector(':scope > path'), rows = t.querySelectorAll('.veo-pyramid_dots path');
    tl.from(shape, { opacity: 0, y: 34, duration: 1, ease: 'expo.out' }, .1 + i * .24);
    tl.from(rows, { opacity: 0, duration: .45, stagger: { each: .06, from: 'end' }, ease: 'power1.out' }, .35 + i * .24);
  });
  if (glow) tl.from(glow, { opacity: 0, scale: .5, transformOrigin: '50% 50%', duration: 1.6, ease: 'power2.out' }, .45);
  tl.from(pills, { opacity: 0, scale: .85, filter: 'blur(6px)', duration: .7, ease: 'back.out(1.7)', stagger: { each: .1, from: 'end' }, clearProps: 'filter' }, .8);
  tl.to(links, { strokeDashoffset: 0, duration: .8, ease: 'power2.inOut' }, 1.05);
  tl.from(nodes, { scale: 0, transformOrigin: '50% 50%', duration: .5, ease: 'back.out(2.5)', stagger: .08 }, 1.05);
  tl.from(notes, { opacity: 0, filter: 'blur(6px)', duration: .8, ease: 'power2.out', stagger: .1, clearProps: 'filter' }, 1.3);
  tl.add(() => {
    // living afterglow: the middle of the pyramid keeps breathing and its donors twinkle
    if (glow) gsap.to(glow, { opacity: .65, scale: 1.05, transformOrigin: '50% 50%', duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const veoRows = tiers[1]?.querySelectorAll('.veo-pyramid_dots path');
    if (veoRows) gsap.to(veoRows, { opacity: .45, duration: 1.4, ease: 'sine.inOut', stagger: { each: .35, repeat: -1, yoyo: true } });
  });
  ScrollTrigger.create({ trigger: box, start: 'top 72%', once: true, onEnter: () => tl.play() });

  const cards = box.parentElement.querySelectorAll('.veo-meet_card');
  if (cards.length) gsap.from(cards, { opacity: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', stagger: .14, clearProps: 'filter', scrollTrigger: { trigger: box, start: 'top 72%', once: true } });
  const chip = box.parentElement.querySelector('.veo-meet_chip');
  if (chip) gsap.from(chip, { opacity: 0, scale: .8, duration: .8, ease: 'back.out(2)', delay: .6, scrollTrigger: { trigger: chip, start: 'top 92%', once: true } });
}

/* ---------- featured stat: the number counts while the meter fills tick by tick ---------- */
function stats() {
  const card = document.querySelector('.product-stats_feature'); if (!card) return;
  const ink = card.querySelector('.product-stats_ink');
  const layer = ink ? inkLayer(ink, { host: card, origin: [1, 1], seed: 7.7 }) : null;
  const meter = card.querySelector('[data-gz-meter]'), num = card.querySelector('.product-stats_feature-number');
  const N = 60, on = meter ? Math.round(parseFloat(meter.dataset.gzMeter) / 100 * N) : 0;
  const ticks = [];
  if (meter) {
    meter.classList.add('is-js');
    for (let i = 0; i < N; i++) { const t = document.createElement('span'); t.className = 'gz-tick' + (i === on ? ' is-edge' : ''); meter.appendChild(t); ticks.push(t); }
  }
  const rows = gsap.utils.toArray('.product-stats_row');
  if (REDUCED) { layer?.setReveal(1); ticks.slice(0, on).forEach(t => t.classList.add('is-on')); return; }
  const dur = 1.9;
  const tl = gsap.timeline({ paused: true });
  if (layer) { const o = { r: 0 }; tl.to(o, { r: 1, duration: 2.6, ease: 'power2.out', onUpdate: () => layer.setReveal(o.r) }, 0); }
  tl.from(card, { opacity: 0, filter: 'blur(12px)', duration: 1, ease: 'power3.out', clearProps: 'filter' }, 0);
  if (ticks.length) {
    tl.from(ticks, { scaleY: 0, transformOrigin: '50% 100%', duration: .6, ease: 'expo.out', stagger: .008 }, .15);
    ticks.slice(0, on).forEach((t, i) => tl.add(() => t.classList.add('is-on'), .45 + (i / on) * dur * .8));
  }
  if (num) { const c = countTo(num, { duration: dur, trigger: null }); if (c) tl.add(c.play(), .45); }
  card.querySelectorAll('.product-stats_chip').forEach((chip, i) => tl.from(chip, { opacity: 0, x: -10, filter: 'blur(6px)', duration: .7, ease: 'power2.out', clearProps: 'filter' }, .6 + i * .12));
  if (rows.length) tl.from(rows, { opacity: 0, filter: 'blur(12px)', duration: 1, ease: 'power3.out', stagger: .12, clearProps: 'filter' }, .15);
  rows.forEach((r, i) => { const n = r.querySelector('.product-stats_row-number'); const c = n && countTo(n, { duration: 1.6, trigger: null }); if (c) tl.add(c.play(), .35 + i * .12); });
  ScrollTrigger.create({ trigger: card, start: 'top 78%', once: true, onEnter: () => tl.play() });
}

/* ---------- capabilities: cards develop in as they arrive ---------- */
function capabilities() {
  const cards = gsap.utils.toArray('.veo-cap_card'); if (!cards.length || REDUCED) return;
  gsap.set(cards, { opacity: 0, filter: 'blur(10px)' });
  ScrollTrigger.batch(cards, { start: 'top 92%', once: true, interval: .12,
    onEnter: batch => gsap.to(batch, { opacity: 1, filter: 'blur(0px)', duration: .9, ease: 'power2.out', stagger: .07, clearProps: 'filter' }) });
  gsap.utils.toArray('.veo-cap_group-head').forEach(h => {
    gsap.fromTo(h, { '--gz-line': 0 }, { '--gz-line': 1, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
    gsap.from(h.children, { opacity: 0, filter: 'blur(8px)', duration: .8, stagger: .08, ease: 'power2.out', clearProps: 'filter', scrollTrigger: { trigger: h, start: 'top 90%', once: true } });
  });
}

/* ---------- trust: pillars arrive, Lauren introduces herself, the opt-out rate counts ---------- */
function trust() {
  const box = document.querySelector('.veo-trust_component'); if (!box || REDUCED) return;
  const pillars = box.querySelectorAll('.veo-trust_pillar');
  const grid = box.querySelector('.veo-trust_pillars') || box;
  const tl = gsap.timeline({ paused: true });
  tl.from(pillars, { opacity: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', stagger: .12, clearProps: 'filter' }, 0);
  const bubble = box.querySelector('.veo-trust_bubble'), msg = box.querySelector('.veo-trust_bubble-text');
  if (bubble) tl.from(bubble, { opacity: 0, scale: .94, transformOrigin: '0% 100%', duration: .7, ease: 'back.out(1.6)' }, .25);
  if (msg) { const split = new SplitText(msg, { type: 'words' }); tl.from(split.words, { opacity: 0, filter: 'blur(6px)', duration: .45, ease: 'power2.out', stagger: .05, clearProps: 'filter' }, .55); }
  const ai = box.querySelectorAll('.veo-trust_ai, .veo-trust_highlight');
  if (ai.length) tl.fromTo(ai, { textShadow: '0 0 0 rgba(242,140,40,0)' }, { textShadow: '0 0 14px rgba(242,140,40,.9)', duration: .5, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.2);
  const big = box.querySelector('.veo-trust_big'); if (big) { const c = countTo(big, { duration: 2.2, trigger: null }); if (c) tl.add(c.play(), .3); }
  const av = box.querySelectorAll('.veo-trust_avatar');
  if (av.length === 2) { tl.from(av[0], { x: -18, opacity: 0, duration: .9, ease: 'expo.out' }, .4); tl.from(av[1], { x: 18, opacity: 0, duration: .9, ease: 'expo.out' }, .4); }
  const review = box.querySelector('.veo-trust_review'); if (review) tl.from(review, { opacity: 0, filter: 'blur(6px)', duration: .7, ease: 'power2.out', clearProps: 'filter' }, .75);
  ScrollTrigger.create({ trigger: grid, start: 'top 82%', once: true, onEnter: () => tl.play() });
}

/* ---------- customer proof: the active story opens in the centre; neighbours wait as logo cards ---------- */
function proof() {
  const slider = document.querySelector('.veo-proof_slider'); if (!slider) return;
  const track = slider.querySelector('.veo-proof_track'); const slides = [...track.children];
  const n = slides.length; if (n < 2) return;
  const comp = slider.closest('.veo-proof_component') || slider.parentElement;
  const prev = comp.querySelector('.veo-proof_arrow.is-prev'), next = comp.querySelector('.veo-proof_arrow:not(.is-prev)');
  let active = Math.max(0, slides.findIndex(s => s.classList.contains('is-active')));
  slider.classList.add('is-js');
  const apply = () => {
    // keep the active story in the middle: previous · active · next
    for (let k = -1; k < n - 1; k++) track.appendChild(slides[(active + k + n) % n]);
    slides.forEach((s, i) => {
      const on = i === active; s.classList.toggle('is-active', on);
      const card = s.querySelector('.veo-proof_card'); if (card) { card.inert = !on; card.setAttribute('aria-hidden', String(!on)); }
      const peek = s.querySelector('.veo-proof_peek'); if (peek) { peek.setAttribute('role', 'button'); peek.setAttribute('tabindex', on ? '-1' : '0'); peek.removeAttribute('aria-hidden'); peek.setAttribute('aria-label', 'Show story: ' + (card?.getAttribute('aria-label') || '')); peek.inert = on; }
    });
  };
  apply();
  let busy = false;
  function go(i) {
    i = (i + n) % n; if (busy || i === active) return;
    const dir = i === (active + 1) % n ? 1 : -1;
    const wrapper = n > 2 ? slides[(active - dir + n) % n] : null;   // the slide that wraps round the edge
    const state = Flip.getState(slides);
    active = i; apply();
    const card = slides[active].querySelector('.veo-proof_card');
    const parts = card ? card.querySelectorAll('.veo-proof_logo, .veo-proof_context, .veo-proof_quote, .veo-proof_author, .veo-proof_side') : [];
    if (REDUCED) return;
    if (MOBILE.matches) { gsap.fromTo(parts, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: .6, stagger: .05, ease: 'power2.out', clearProps: 'filter' }); return; }
    busy = true;
    Flip.from(state, { targets: slides.filter(s => s !== wrapper), duration: .95, ease: 'expo.inOut', scale: false, simple: true, onComplete: () => { busy = false; } });
    if (wrapper) gsap.fromTo(wrapper, { opacity: 0, x: dir * 80 }, { opacity: 1, x: 0, duration: .8, delay: .3, ease: 'power3.out', clearProps: 'x' });
    gsap.fromTo(parts, { opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)', duration: .8, delay: .4, stagger: .06, ease: 'power2.out', clearProps: 'filter' });
  }
  prev?.addEventListener('click', e => { e.preventDefault(); go(active - 1); });
  next?.addEventListener('click', e => { e.preventDefault(); go(active + 1); });
  slides.forEach((s, i) => {
    const peek = s.querySelector('.veo-proof_peek'); if (!peek) return;
    peek.addEventListener('click', () => go(i));
    peek.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(i); } });
  });
  let inView = false;
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { threshold: .4 }).observe(slider);
  addEventListener('keydown', e => {
    if (!inView || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowRight') go(active + 1); else if (e.key === 'ArrowLeft') go(active - 1);
  });
  // swipe
  let sx = null;
  slider.addEventListener('pointerdown', e => { sx = e.clientX; });
  slider.addEventListener('pointerup', e => { if (sx == null) return; const dx = e.clientX - sx; sx = null; if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1)); });
  if (!REDUCED) gsap.from(slides, { opacity: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', stagger: .1, clearProps: 'filter', scrollTrigger: { trigger: slider, start: 'top 82%', once: true } });
}

/* ---------- FAQ: one answer open at a time ---------- */
function faq() {
  document.querySelectorAll('.product-faq_list').forEach(list => {
    list.classList.add('is-js');
    const items = [...list.querySelectorAll('.product-faq_item')];
    const setters = items.map((it, i) => {
      const btn = it.querySelector('.product-faq_trigger'), ans = it.querySelector('.product-faq_answer'); if (!btn || !ans) return () => { };
      const set = (open, animate) => {
        it.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', String(open)); ans.inert = !open;
        if (!animate || REDUCED) { gsap.set(ans, { height: open ? 'auto' : 0 }); return; }
        gsap.to(ans, { height: open ? 'auto' : 0, duration: .65, ease: 'expo.out', overwrite: true, onComplete: () => ScrollTrigger.refresh() });
        if (open && ans.firstElementChild) gsap.fromTo(ans.firstElementChild, { opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)', duration: .6, delay: .08, ease: 'power2.out', clearProps: 'filter' });
      };
      set(i === 0, false);
      btn.addEventListener('click', e => {
        e.preventDefault(); const open = !it.classList.contains('is-open');
        setters.forEach((s, k) => { if (k !== i && items[k].classList.contains('is-open')) s(false, true); });
        set(open, true);
      });
      btn.addEventListener('keydown', e => { if (e.key === ' ') { e.preventDefault(); btn.click(); } });
      return set;
    });
    if (!REDUCED) gsap.from(items, { opacity: 0, filter: 'blur(8px)', duration: .8, ease: 'power2.out', stagger: .08, clearProps: 'filter', scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
  });
}

export function initProduct() {
  for (const [name, fn] of Object.entries({ hero, pyramid, stats, capabilities, trust, proof, faq })) {
    try { fn(); } catch (e) { console.error('[givzey] product', name, e); }
  }
}
export const hasProductHero = () => !!document.querySelector('.section_product-hero');
