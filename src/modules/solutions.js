// Solutions pages (/solutions/*): every mock acts itself out instead of only fading in.
//   panel    → the chart builds left to right (bars rise, dot rows fill, lines draw, labels settle)
//   results  → $ raised / donors / re-engaged count up like the product pages, the VEO meter fills dot by dot
//   chat     → the conversation plays: Lauren writes, typing dots, the donor answers, the caption lands
//   stories  → PHI glass (bubbles, the redaction sweeps, flags arrive), parent figure, Giving Tuesday chart
//   start    → the portfolio card: bar segments fill in order, rows arrive, counts run
// Runs before secondary.js and claims what it animates, so the generic reveals leave these alone.
// Reduced motion: nothing here runs and the page shows its final state.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { countTo } from './product.js';
import { claim } from './reveal.js';
import { REDUCED } from '../base.js';

const once = (trigger, start, tl) => ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
const develop = { opacity: 0, y: 24, filter: 'blur(12px)', duration: 1, ease: 'power3.out', clearProps: 'filter,transform' };
const num = (el, a) => parseFloat(el.getAttribute(a)) || 0;
const isPattern = el => /url\(/.test(el.getAttribute('fill') || '');

// a number that counts inside a timeline (starts at 0, ends on the exact original text)
function count(el, tl, at, duration = 1.8) {
  if (!el) return;
  claim(el);
  const c = countTo(el, { trigger: null, duration });
  if (c) { c.pause(0); tl.add(() => c.play(0), at); }
}

// builds an inline SVG chart from left to right with attribute tweens (no transforms, so patterns never squash)
function buildSvg(svg, tl, at = 0, { spread = .9, mode = 'auto' } = {}) {
  claim(svg);
  if (svg.dataset.axis === 'y') return buildTall(svg, tl, at, spread);
  const vb = svg.viewBox && svg.viewBox.baseVal; const W = (vb && vb.width) || 1000;
  const when = x => at + spread * Math.max(0, Math.min(1, x / W));
  svg.querySelectorAll('rect, line, circle, ellipse, text, path, polyline').forEach(el => {
    if (el.closest('defs, pattern, clipPath, mask, linearGradient, radialGradient')) return;
    const tag = el.tagName.toLowerCase();
    if (tag === 'rect') {
      const x = num(el, 'x'), y = num(el, 'y'), w = num(el, 'width'), h = num(el, 'height'), r = num(el, 'rx');
      const pill = r >= h / 2 - 1 && h <= 34 && w > h * 1.6, boxed = el.getAttribute('stroke') && el.getAttribute('fill') === '#fff';
      if (pill || boxed) { tl.from(el, { opacity: 0, duration: .5, ease: 'power2.out' }, when(x) + .2); return; }
      const vertical = mode !== 'horizontal' && !isPattern(el) && w <= 60 && h > 0;
      if (vertical) tl.from(el, { attr: { y: y + h, height: 0 }, duration: .9, ease: 'expo.out' }, when(x));
      else tl.from(el, { attr: { width: 0 }, duration: 1.1, ease: 'power3.inOut' }, when(x));
    } else if (tag === 'line') {
      const x1 = num(el, 'x1'), x2 = num(el, 'x2'), y1 = num(el, 'y1'), y2 = num(el, 'y2');
      if (Math.abs(x2 - x1) > 40) tl.from(el, { attr: { x2: x1 }, duration: 1.2, ease: 'power2.inOut' }, when(Math.min(x1, x2)));
      else if (Math.abs(y2 - y1) > 40) tl.from(el, { attr: { y1: Math.max(y1, y2) }, duration: .9, ease: 'power2.out' }, when(x1));
      else tl.from(el, { opacity: 0, duration: .4 }, when(x1) + .1);
    } else if (tag === 'circle' || tag === 'ellipse') {
      tl.from(el, { attr: { r: 0 }, opacity: 0, duration: .55, ease: 'back.out(2.4)' }, when(num(el, 'cx')) + .15);
    } else if (tag === 'text') {
      tl.from(el, { opacity: 0, duration: .6, ease: 'power2.out' }, when(num(el, 'x')) + .25);
    } else {
      tl.from(el, { opacity: 0, duration: .6 }, when(0) + .1);
    }
  });
}

// a chart that reads top to bottom (phone / tablet timelines): builds downwards
function buildTall(svg, tl, at, spread) {
  const vb = svg.viewBox && svg.viewBox.baseVal; const H = (vb && vb.height) || 1000;
  const when = y => at + spread * Math.max(0, Math.min(1, y / H));
  svg.querySelectorAll('rect, line, circle, text, path').forEach(el => {
    const tag = el.tagName.toLowerCase();
    if (el.closest('defs')) return;
    if (tag === 'rect') {
      const y = num(el, 'y'), h = num(el, 'height');
      if (h > 40) tl.from(el, { attr: { height: 0 }, duration: 1.2, ease: 'power3.inOut' }, when(y));
      else tl.from(el, { opacity: 0, duration: .5, ease: 'power2.out' }, when(y) + .2);
    } else if (tag === 'line') {
      const x1 = num(el, 'x1'), x2 = num(el, 'x2'), y1 = num(el, 'y1'), y2 = num(el, 'y2');
      if (Math.abs(y2 - y1) > 40) tl.from(el, { attr: { y2: y1 }, duration: 1.2, ease: 'power2.inOut' }, when(Math.min(y1, y2)));
      else if (Math.abs(x2 - x1) > 40) tl.from(el, { attr: { x2: x1 }, duration: .9, ease: 'power2.out' }, when(y1));
      else tl.from(el, { opacity: 0, duration: .4 }, when(y1) + .1);
    } else if (tag === 'circle') {
      tl.from(el, { attr: { r: 0 }, opacity: 0, duration: .55, ease: 'back.out(2.4)' }, when(num(el, 'cy')) + .15);
    } else if (tag === 'text') {
      tl.from(el, { opacity: 0, duration: .6, ease: 'power2.out' }, when(num(el, 'y')) + .25);
    } else tl.from(el, { opacity: 0, duration: .6 }, when(0) + .3);
  });
}

/* ---------- healthcare: the grateful patient window (Q.A. round 4: labels no longer crowd or clip) ----------
   Drawn here instead of the Webflow markup: wide at desktop, a top-to-bottom timeline below 992px, pills sized to
   their words. Keyed on the chart's aria-label, so a reworded chart in Webflow is left alone. */
const INK = '#030b2c', BLUE = '#045CE8', MUTE = 'rgba(3,11,44,.55)';
function careWide() {
  const X = [['Month 1', 124], ['Month 2', 239], ['Month 3', 353], ['Month 4', 467], ['Month 5', 582], ['Month 6', 696], ['Month 9', 797], ['Month 12', 888]];
  const dots = X.slice(0, 6).map(([, x]) => `<circle cx="${x}" cy="128" r="7" fill="${BLUE}" stroke="#fff" stroke-width="2"/>`).join('');
  const ticks = X.map(([t, x]) => `<line x1="${x}" y1="196" x2="${x}" y2="204" stroke="rgba(3,11,44,.2)"/><text x="${x}" y="228" font-size="12" text-anchor="middle" fill="${MUTE}">${t}</text>`).join('');
  return `<svg class="sol-svg is-wide" viewBox="0 0 920 238" role="img">
<defs><linearGradient id="gzCareBandW" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#C3D7F8"/><stop offset="1" stop-color="#C3D7F8" stop-opacity="0"/></linearGradient></defs>
<rect x="10" y="10" width="690" height="190" fill="url(#gzCareBandW)"/>
<line x1="10" y1="10" x2="10" y2="200" stroke="${BLUE}" stroke-width="2"/>
<text x="28" y="40" font-size="13" fill="rgba(3,11,44,.75)">Most likely to give in the months right after care</text>
<line x1="10" y1="200" x2="910" y2="200" stroke="rgba(3,11,44,.14)" stroke-width="1.5"/>
<circle cx="10" cy="200" r="6" fill="${INK}"/>
<text x="10" y="228" font-size="12" font-weight="500" fill="${INK}">Care</text>${ticks}
<line x1="124" y1="128" x2="696" y2="128" stroke="${BLUE}" stroke-width="1.5"/>
<line x1="708" y1="128" x2="789" y2="128" stroke="rgba(3,11,44,.4)" stroke-width="1.2" stroke-dasharray="4 4"/>
<circle cx="797" cy="128" r="6" fill="#fff" stroke="rgba(3,11,44,.5)" stroke-width="1.2"/>
<text x="910" y="162" font-size="12" font-weight="500" text-anchor="end" fill="rgba(3,11,44,.7)">Most teams cannot reach them in time</text>
<line x1="696" y1="102" x2="696" y2="120" stroke="${BLUE}" stroke-width="1.5"/>${dots}
<g class="gz-pill" data-x="110" data-cy="88" data-fs="12"><rect fill="#fff" stroke="rgba(3,11,44,.08)"/><circle r="3.5" fill="${BLUE}"/><text font-size="12" font-weight="500" fill="${INK}">Grateful Patient VEO · six-month journey</text></g>
<g class="gz-pill is-solid" data-x="696" data-cy="88" data-fs="12" data-align="middle"><rect fill="${BLUE}"/><text font-size="12" font-weight="500" fill="#fff">Converts or hands off</text></g>
</svg>`;
}
function careTall() {
  const Y = [['Month 1', 104], ['Month 2', 144], ['Month 3', 184], ['Month 4', 224], ['Month 5', 264], ['Month 6', 304], ['Month 9', 372], ['Month 12', 424]];
  const dots = Y.slice(0, 6).map(([, y]) => `<circle cx="104" cy="${y}" r="7" fill="${BLUE}" stroke="#fff" stroke-width="2"/>`).join('');
  const ticks = Y.map(([t, y]) => `<line x1="68" y1="${y}" x2="76" y2="${y}" stroke="rgba(3,11,44,.2)"/><text x="0" y="${y + 4.5}" font-size="13" fill="${MUTE}">${t}</text>`).join('');
  return `<svg class="sol-svg gz-care-tall" viewBox="0 0 340 440" role="img" data-axis="y">
<defs><linearGradient id="gzCareBandT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C3D7F8"/><stop offset="1" stop-color="#C3D7F8" stop-opacity="0"/></linearGradient></defs>
<rect x="72" y="30" width="268" height="290" fill="url(#gzCareBandT)"/>
<line x1="72" y1="30" x2="340" y2="30" stroke="${BLUE}" stroke-width="2"/>
<text x="90" y="56" font-size="14" fill="rgba(3,11,44,.75)">Most likely to give in the</text>
<text x="90" y="74" font-size="14" fill="rgba(3,11,44,.75)">months right after care</text>
<line x1="72" y1="30" x2="72" y2="432" stroke="rgba(3,11,44,.14)" stroke-width="1.5"/>
<circle cx="72" cy="30" r="6" fill="${INK}"/>
<text x="0" y="34.5" font-size="13" font-weight="500" fill="${INK}">Care</text>${ticks}
<line x1="104" y1="104" x2="104" y2="304" stroke="${BLUE}" stroke-width="1.5"/>
<line x1="104" y1="316" x2="104" y2="364" stroke="rgba(3,11,44,.4)" stroke-width="1.2" stroke-dasharray="4 4"/>
<circle cx="104" cy="372" r="6" fill="#fff" stroke="rgba(3,11,44,.5)" stroke-width="1.2"/>${dots}
<text x="126" y="180" font-size="14" font-weight="500" fill="${INK}">Grateful Patient VEO</text>
<text x="126" y="199" font-size="13" fill="${MUTE}">six-month journey</text>
<g class="gz-pill is-solid" data-x="124" data-cy="304" data-fs="13"><rect fill="${BLUE}"/><text font-size="13" font-weight="500" fill="#fff">Converts or hands off</text></g>
<text x="124" y="368" font-size="13" font-weight="500" fill="rgba(3,11,44,.7)">Most teams cannot reach</text>
<text x="124" y="386" font-size="13" font-weight="500" fill="rgba(3,11,44,.7)">them in time</text>
</svg>`;
}
// pills fit their words: measure the text, then size the capsule around it
function fitPills(svg) {
  svg.querySelectorAll('.gz-pill').forEach(g => {
    const text = g.querySelector('text'), rect = g.querySelector('rect'), dot = g.querySelector('circle');
    const fs = +g.dataset.fs || 12, h = Math.round(fs * 2.3), pad = Math.round(fs * 1.15), dotW = dot ? 14 : 0;
    let tw = 0; try { tw = text.getComputedTextLength(); } catch (e) { }
    if (!tw) tw = text.textContent.length * fs * .56;
    const w = Math.ceil(tw + pad * 2 + dotW), cx = +g.dataset.x, cy = +g.dataset.cy;
    const x = g.dataset.align === 'middle' ? cx - w / 2 : cx;
    Object.entries({ x, y: cy - h / 2, width: w, height: h, rx: h / 2 }).forEach(([k, v]) => rect.setAttribute(k, v));
    if (dot) { dot.setAttribute('cx', x + pad + 3.5); dot.setAttribute('cy', cy); }
    text.setAttribute('x', x + pad + dotW); text.setAttribute('y', cy + fs * .36);
  });
}
function careChart() {
  const first = document.querySelector('.sol-panel svg[aria-label^="A grateful patient is most likely"]'); if (!first) return;
  const label = first.getAttribute('aria-label');
  const mq = matchMedia('(max-width: 991px)');
  let current = first;
  const draw = () => {
    const box = document.createElement('div'); box.innerHTML = mq.matches ? careTall() : careWide();
    const svg = box.firstElementChild; svg.setAttribute('aria-label', label);
    current.replaceWith(svg); current = svg; fitPills(svg);
    svg.closest('.sol-panel')?.classList.toggle('is-care-tall', mq.matches);
  };
  draw();
  mq.addEventListener('change', draw);
}

/* ---------- the gap: panel + chart, then the results band ---------- */
function panel(p) {
  claim(p);
  const tl = gsap.timeline({ paused: true });
  tl.from(p, { ...develop, duration: 1.1 }, 0);
  const blob = p.querySelector('.sol-blob'); if (blob) { claim(blob); tl.from(blob, { opacity: 0, scale: .6, duration: 1.8, ease: 'power2.out' }, .1); }
  const legend = p.querySelectorAll('.sol-legend_item'); legend.forEach(claim);
  if (legend.length) tl.from(legend, { opacity: 0, x: -8, duration: .6, ease: 'power2.out', stagger: .1, clearProps: 'transform' }, .35);
  const svg = p.querySelector('svg'); if (svg) buildSvg(svg, tl, .4, { spread: 1.1 });
  once(p, 'top 80%', tl);
}

function results(r) {
  claim(r); r.classList.add('is-js');
  const cols = [...r.querySelectorAll('.sol-results_col')];
  const tl = gsap.timeline({ paused: true });
  cols.forEach(claim);
  tl.from(cols, { ...develop, stagger: .12 }, 0);
  // the hairline over each column draws in
  cols.forEach((c, i) => tl.fromTo(c, { '--gz-line': 0 }, { '--gz-line': 1, duration: 1.2, ease: 'expo.out' }, .05 + i * .12));
  r.querySelectorAll('.sol-results_text, .sol-results_label, .sol-results_note').forEach(claim);
  count(r.querySelector('.sol-results_big'), tl, .2, 2.2);
  r.querySelectorAll('.sol-results_num').forEach((n, i) => count(n, tl, .45 + i * .12, 1.8));
  const meter = r.querySelector('.sol-meter');
  if (meter) {
    claim(meter);
    const rects = [...meter.querySelectorAll(':scope > rect')];
    const filled = rects.filter(x => !/o\)$/.test(x.getAttribute('fill') || '') && !/mo\b/.test(x.getAttribute('fill') || ''));
    const open = rects.filter(x => !filled.includes(x));
    tl.from(filled, { attr: { width: 0 }, duration: .9, ease: 'power2.inOut', stagger: .3 }, .5);
    tl.from(open, { attr: { width: 0 }, opacity: 0, duration: .8, ease: 'power2.out' }, .5 + filled.length * .3 + .15);
  }
  once(r, 'top 85%', tl);
}

/* ---------- conversations: messages arrive one by one, with typing dots before each reply ---------- */
function typing(chat, bubble) {
  const dots = document.createElement('div');
  dots.className = 'sol-typing' + (bubble.classList.contains('is-me') ? ' is-me' : '');
  dots.setAttribute('aria-hidden', 'true'); dots.innerHTML = '<span></span><span></span><span></span>';
  chat.appendChild(dots);
  const place = () => { dots.style.top = bubble.offsetTop + 'px'; if (bubble.classList.contains('is-me')) { dots.style.right = (chat.clientWidth - bubble.offsetLeft - bubble.offsetWidth) + 'px'; dots.style.left = 'auto'; } else { dots.style.left = bubble.offsetLeft + 'px'; } };
  place(); gsap.set(dots, { opacity: 0, scale: .6 });
  return { dots, place };
}
function conversation(chat, tl, at = 0) {
  claim(chat);
  const bubbles = [...chat.querySelectorAll('.sol-bubble')];
  const head = chat.querySelector('.sol-chat_head');
  if (head) { head.querySelectorAll('*').forEach(claim); tl.from(head.children, { opacity: 0, filter: 'blur(6px)', y: 6, duration: .6, ease: 'power2.out', stagger: .08, clearProps: 'filter,transform' }, at); }
  let t = at + .35;
  bubbles.forEach((b, i) => {
    claim(b); b.querySelectorAll('*').forEach(claim);
    const me = b.classList.contains('is-me');
    if (i > 0) {
      const { dots, place } = typing(chat, b);
      tl.add(place, t).to(dots, { opacity: 1, scale: 1, duration: .35, ease: 'back.out(2)' }, t)
        .to(dots, { opacity: 0, scale: .6, duration: .25, ease: 'power2.in' }, t + .75);
      t += .9;
    }
    tl.from(b, { opacity: 0, scale: .94, y: 10, filter: 'blur(8px)', transformOrigin: me ? '100% 100%' : '0% 100%', duration: .7, ease: 'expo.out', clearProps: 'filter,transform' }, t);
    t += .5;
  });
  return t;
}

function donors(d) {
  const preview = d.querySelector('.sol-preview'); if (!preview) return;
  const chat = preview.querySelector('.sol-chat'); if (!chat) return;
  claim(preview);
  const tl = gsap.timeline({ paused: true });
  tl.from(preview, { ...develop, duration: 1.1 }, 0);
  const blob = preview.querySelector('.sol-blob'); if (blob) { claim(blob); tl.from(blob, { opacity: 0, scale: .6, duration: 1.8, ease: 'power2.out' }, .1); }
  tl.from(chat, { opacity: 0, y: 20, scale: .97, filter: 'blur(10px)', duration: .9, ease: 'power3.out', clearProps: 'filter,transform' }, .2);
  const end = conversation(chat, tl, .55);
  const cap = preview.querySelector('.sol-caption');
  if (cap) { claim(cap); cap.querySelectorAll('*').forEach(claim); tl.from(cap, { opacity: 0, filter: 'blur(6px)', y: 8, duration: .7, ease: 'power2.out', clearProps: 'filter,transform' }, end + .1); }
  once(preview, 'top 78%', tl);
}

/* ---------- stories ---------- */
function glass(g) {   // healthcare: PHI detection
  claim(g);
  const tl = gsap.timeline({ paused: true });
  tl.from(g, { ...develop }, 0);
  const bubbles = [...g.querySelectorAll('.sol-bubble')];
  let t = .35;
  bubbles.forEach((b, i) => {
    claim(b); b.querySelectorAll('*').forEach(claim);
    tl.from(b, { opacity: 0, y: 10, scale: .95, filter: 'blur(8px)', transformOrigin: b.classList.contains('is-me') ? '100% 100%' : '0% 100%', duration: .7, ease: 'expo.out', clearProps: 'filter,transform' }, t);
    t += i ? .5 : .7;
  });
  const red = g.querySelector('.sol-redact');
  if (red) tl.fromTo(red, { clipPath: 'inset(0 100% 0 0 round 3px)' }, { clipPath: 'inset(0 0% 0 0 round 3px)', duration: .6, ease: 'power2.inOut', clearProps: 'clipPath' }, t + .1);
  const flags = [...g.querySelectorAll('.sol-flag')]; flags.forEach(f => { claim(f); f.querySelectorAll('*').forEach(claim); });
  flags.forEach((f, i) => {
    tl.from(f, { opacity: 0, x: -14, filter: 'blur(6px)', duration: .6, ease: 'power3.out', clearProps: 'filter,transform' }, t + .45 + i * .4);
    const dot = f.querySelector('.sol-flag_dot'); if (dot) tl.from(dot, { scale: 0, duration: .45, ease: 'back.out(3)', clearProps: 'transform' }, t + .6 + i * .4);
  });
  once(g, 'top 80%', tl);
}

function figure(f) {   // independent schools: the parent's thank-you
  claim(f);
  const tl = gsap.timeline({ paused: true });
  const img = f.querySelector('.sol-figure_img'), bubble = f.querySelector('.sol-figure_bubble'), pill = f.querySelector('.sol-figure_pill');
  [img, bubble, pill].forEach(claim);
  tl.fromTo(f, { clipPath: 'inset(6% 6% 6% 6% round 2rem)', opacity: 0 }, { clipPath: 'inset(0% 0% 0% 0% round 0rem)', opacity: 1, duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' }, 0);
  if (img) tl.from(img, { scale: 1.08, filter: 'blur(10px)', duration: 1.6, ease: 'expo.out', clearProps: 'filter,transform' }, 0);
  if (bubble) tl.from(bubble, { opacity: 0, scale: .85, y: 12, transformOrigin: '0% 100%', duration: .8, ease: 'back.out(1.8)', clearProps: 'transform' }, .7);
  if (pill) tl.from(pill, { opacity: 0, y: 10, filter: 'blur(6px)', duration: .7, ease: 'power3.out', clearProps: 'filter,transform' }, 1);
  once(f, 'top 80%', tl);
}

function chart(c) {   // mission-driven: Giving Tuesday, day by day
  claim(c);
  const tl = gsap.timeline({ paused: true });
  tl.from(c, { ...develop }, 0);
  const title = c.querySelector('.sol-chart_title'); if (title) { claim(title); tl.from(title, { opacity: 0, filter: 'blur(6px)', duration: .6, clearProps: 'filter' }, .2); }
  const svg = c.querySelector('svg'); if (svg) buildSvg(svg, tl, .35, { spread: 1 });
  once(c, 'top 80%', tl);
}

function storyStats(s) {
  claim(s);
  const stats = [...s.querySelectorAll('.sol-story_stat')]; stats.forEach(x => { claim(x); x.querySelectorAll('*').forEach(claim); });
  const tl = gsap.timeline({ paused: true });
  tl.from(stats, { ...develop, stagger: .1 }, 0);
  stats.forEach((x, i) => count(x.querySelector('.sol-story_num'), tl, .15 + i * .1, 1.8));
  once(s, 'top 88%', tl);
}

/* ---------- first portfolio card ---------- */
function portfolio(card) {
  claim(card);
  const tl = gsap.timeline({ paused: true });
  tl.from(card, { ...develop, duration: 1.1 }, 0);
  const head = card.querySelector('.sol-chat_head');
  if (head) { head.querySelectorAll('*').forEach(claim); tl.from(head.children, { opacity: 0, filter: 'blur(6px)', y: 6, duration: .6, stagger: .08, ease: 'power2.out', clearProps: 'filter,transform' }, .2); }
  const bar = card.querySelector('.sol-portfolio_bar');
  if (bar) { claim(bar); tl.from(bar.querySelectorAll('rect'), { attr: { width: 0 }, duration: .7, ease: 'power3.inOut', stagger: .22 }, .45); }
  const rows = [...card.querySelectorAll('.sol-row')]; rows.forEach(r => { claim(r); r.querySelectorAll('*').forEach(claim); });
  tl.from(rows, { opacity: 0, x: -10, filter: 'blur(6px)', duration: .6, ease: 'power2.out', stagger: .22, clearProps: 'filter,transform' }, .5);
  rows.forEach((r, i) => {
    const dot = r.querySelector('.sol-row_dot'); if (dot) tl.from(dot, { scale: 0, duration: .4, ease: 'back.out(3)', clearProps: 'transform' }, .55 + i * .22);
    count(r.querySelector('.sol-row_num'), tl, .55 + i * .22, 1.2);
  });
  once(card, 'top 82%', tl);
}

export function initSolutions() {
  try { careChart(); } catch (e) { console.error('[givzey] solutions careChart', e); }
  if (REDUCED || !document.querySelector('.sol-panel, .sol-donors, .sol-start')) return;
  const run = (sel, fn) => document.querySelectorAll(sel).forEach(el => { try { fn(el); } catch (e) { console.error('[givzey] solutions', sel, e); } });
  run('.sol-panel', panel);
  run('.sol-results', results);
  run('.sol-donors', donors);
  run('.sol-glass', glass);
  run('.sol-figure', figure);
  run('.sol-chart', chart);
  run('.sol-story_stats', storyStats);
  run('.sol-start .sol-card', portfolio);
}
