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
