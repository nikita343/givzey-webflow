// Secondary pages (solutions, trust, Blackbaud, careers, about, book a demo, resources, Version2…):
// everything that no other module animates gets the site's reveal language, so a page is never "heading only".
//   headings  → bleed in word by word (blur + ink blue → final colour)
//   copy      → develops from blur, rises a little
//   cards     → arrive in a soft stagger, their icon blooms
//   visuals   → open like a lens (clip + blur + slight scale): images, mock-ups and pure-shape diagrams
// It walks each section top-down and stops at the first thing it can animate, so nothing is animated twice;
// anything another module already tweens (or marked with data-gz-motion) is left alone.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { headingBleed, claim } from './reveal.js';
import { countTo } from './product.js';
import { REDUCED } from '../base.js';

// sections that own their motion (home, product feature sections, final CTA)
const OWN = /^(section_home|section_veo|section_vpgo|section_vso|section_gap|section_product-(stats|cap|band|faq|intro)|section_cta)/;
const SKIP = '.hs-embed, .w-pagination-wrapper, script, style, .w-embed:not(:has(svg)), [data-gz-skip], .gz-hero-ink, .gz-hero-fx';
const UNIT = /(card|tile|item|row|step|stat|benefit|win|pcell|mile|cert|doc|domain|sector|contact|role|jrow|bcard|kcard|cmp|note|flowcard|stepcard|node|mini|layer|ftile|ctile|sav)$/;
const HEAD = /(^|[-_])(h\d|mh|ph|vh|title|heading|statement)$/;
const NUM = '.v2r-num, .dm-stat_num, .sol-results_num, .sol-story_num, .cs-sector_n, .sol-bignum';
const ICON = '.sol-icon, .cr-chip, .cr-bico, .ab-wico, .cr-go, .sol-num, .dm-num, .dm-sico, .demo_icon, .v2r-bbox, .v2r-dbox, .cr-fico';

const first = el => (el.classList && el.classList[0]) || '';
const isHeading = el => /^H[1-6]$/.test(el.tagName) || [...(el.classList || [])].some(c => HEAD.test(c));
const inlineLike = el => { const d = getComputedStyle(el).display; return d === 'inline' || d === 'contents'; };
// a block whose own content is text (possibly with inline formatting): a paragraph, a link, a label, a button
const DECO = 'br, svg, img, .gz-underline, .gz-btn-ink, .sol-icon, .sol-check, .bb-dot, .demo_icon, [class*="ico"]';
const textual = el => !!el.textContent.trim() && [...el.children].every(c => inlineLike(c) || c.matches(DECO));
const isLight = el => { const m = getComputedStyle(el).color.match(/\d+(\.\d+)?/g); if (!m) return false; const [r, g, b] = m.map(Number); return (r * .299 + g * .587 + b * .114) > 170; };

function busySet() {
  const s = new Set();
  gsap.globalTimeline.getChildren(true, true, false).forEach(t => t.targets?.().forEach(el => el instanceof Element && s.add(el)));
  return s;
}

export function initSecondary() {
  if (REDUCED || document.querySelector('.section_home-hero')) return;
  const main = document.querySelector('.main-wrapper'); if (!main) return;
  const busy = busySet();
  const taken = el => busy.has(el) || (el.dataset && el.dataset.gzMotion);
  const holds = el => [...el.querySelectorAll('*')].some(d => taken(d));

  [...main.children].filter(s => !OWN.test(first(s))).forEach(section => {
    const units = [], heads = [], texts = [], media = [];
    const unitClasses = {};
    section.querySelectorAll('[class]').forEach(e => { const c = first(e); if (UNIT.test(c)) unitClasses[c] = (unitClasses[c] || 0) + 1; });
    const isUnit = el => { const c = first(el); return UNIT.test(c) && (unitClasses[c] >= 2 || /(card|tile)$/.test(c)); };

    (function visit(el) {
      if (el.matches(SKIP) || taken(el) || getComputedStyle(el).display === 'none') return;
      if (isUnit(el) && !holds(el)) { units.push(el); return; }
      if (isHeading(el) && el.textContent.trim()) { if (!holds(el)) heads.push(el); return; }
      if (el.tagName === 'IMG') { media.push(el); return; }
      if (el instanceof SVGElement) { if (el.getBoundingClientRect().width >= 120) media.push(el); return; }
      if (textual(el)) { texts.push(el); return; }
      // a drawing made of shapes (no words inside): treat it as one visual
      if (!el.textContent.trim() && el.children.length) { const r = el.getBoundingClientRect(); if (r.width >= 140 && r.height >= 80) { media.push(el); return; } }
      [...el.children].forEach(visit);
    })(section);

    heads.forEach(h => headingBleed(h, { light: isLight(h), start: 'top 88%' }));
    [...new Set(texts)].forEach(t => { claim(t); develop(t); });
    media.forEach(m => { claim(m); bloom(m); });
    if (units.length) {
      units.forEach(claim);
      gsap.set(units, { opacity: 0, y: 24, filter: 'blur(10px)' });
      units.forEach(u => pendingUnits.add(u));
      ScrollTrigger.batch(units, { start: 'top 90%', once: true, interval: .1,
        onEnter: batch => {
          batch.forEach(u => pendingUnits.delete(u));
          gsap.to(batch, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out', stagger: .08, clearProps: 'filter,transform' });
          batch.forEach((u, i) => u.querySelectorAll(NUM).forEach(n => countTo(n, { trigger: null, duration: 1.8, delay: .1 + i * .08 })?.play()));
          const icons = batch.flatMap(u => [...u.querySelectorAll(ICON)].slice(0, 2));
          if (icons.length) gsap.from(icons, { scale: .6, opacity: 0, duration: .8, ease: 'back.out(2)', stagger: .08, delay: .15, clearProps: 'transform,opacity' });
        } });
    }
  });
  safety();
}

// copy: develops from blur; inline elements cannot move, so they only fade
function develop(el) {
  const inline = inlineLike(el);
  const tl = gsap.timeline({ paused: true });
  tl.from(el, { opacity: 0, filter: 'blur(10px)', y: inline ? 0 : 14, duration: 1.05, ease: 'power3.out', clearProps: 'filter,transform' });
  watch(el, 'top 90%', () => tl.play());
}

// visuals: a lens opening, the picture settles from a slight zoom
function bloom(el) {
  const tl = gsap.timeline({ paused: true });
  tl.fromTo(el, { clipPath: 'inset(7% 6% 7% 6% round 2rem)', opacity: 0, filter: 'blur(14px)', scale: 1.04 },
    { clipPath: 'inset(0% 0% 0% 0% round 0rem)', opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1.5, ease: 'expo.out', clearProps: 'clipPath,filter,transform' });
  watch(el, 'top 88%', () => tl.play());
}

// every reveal fires once; one that can never be reached (bottom of a short page, a list shown later) plays anyway
const pending = new Set(), pendingUnits = new Set();
function watch(el, start, play) {
  let st = null, done = false;
  const fire = () => { if (done) return; done = true; if (st) pending.delete(st); play(); };
  // onEnter can fire inside create() when the element is already above the trigger line (page loaded mid-way)
  st = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: fire });
  st.gzFire = fire;
  if (!done) pending.add(st);
}
function safety() {
  const check = () => {
    const max = ScrollTrigger.maxScroll(window);
    pending.forEach(st => { if (st.start >= max - 2) { st.gzFire(); st.kill(); } });
    // cards below the last reachable trigger line (the bottom of the page) show anyway
    const late = [...pendingUnits].filter(u => u.getBoundingClientRect().top + scrollY - innerHeight * .9 >= max - 2);
    late.forEach(u => pendingUnits.delete(u));
    if (late.length) gsap.to(late, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out', stagger: .08, clearProps: 'filter,transform', scrollTrigger: { trigger: late[0], start: 'top bottom', once: true } });
  };
  ScrollTrigger.addEventListener('refresh', check);
  addEventListener('load', () => setTimeout(check, 300));
}
