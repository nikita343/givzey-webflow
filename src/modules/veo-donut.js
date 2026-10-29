// VEO "Meet the virtual engagement officer": the coverage donut (client tracker 29 Oct, an option in place of the pyramid).
// The card is native Webflow (.veo-donut): the donut, the three drawn sliders and the copy all show their defaults in the
// Designer (30,000 donors, 37 gift officers x 150 = 5,550 managed, 82% unassigned). This only makes it interactive:
// a transparent native range input sits on each drawn slider, and the numbers, arc and sentence follow it.
import { gsap } from 'gsap';
import { REDUCED } from '../base.js';

const fmt = n => Math.round(n).toLocaleString('en-US');

export function initVeoDonut() {
  document.querySelectorAll('[data-veo-donut]').forEach(card => {
    try { wire(card); } catch (e) { console.error('[givzey] veo donut', e); }
  });
}

function wire(card) {
  const out = k => card.querySelectorAll(`[data-out="${k}"]`);
  const set = (k, v) => out(k).forEach(n => { n.textContent = v; });
  const arc = card.querySelector('[data-arc]');
  const vals = {};
  const sliders = [...card.querySelectorAll('.veo-donut_slider[data-in]')];

  sliders.forEach(s => {
    const k = s.dataset.in, min = +s.dataset.min, max = +s.dataset.max;
    vals[k] = +s.dataset.value;
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min, max, step: s.dataset.step || 1, value: vals[k], className: 'veo-donut_input' });
    input.setAttribute('aria-label', s.dataset.label || k);
    s.appendChild(input);
    const fill = s.querySelector('.veo-donut_slider-fill'), thumb = s.querySelector('.veo-donut_slider-thumb');
    const paint = () => { const p = ((vals[k] - min) / (max - min)) * 100 + '%'; fill.style.width = p; thumb.style.left = p; };
    input.addEventListener('input', () => { vals[k] = +input.value; paint(); render(); });
    paint();
  });

  let shown = { pct: 0 };
  function render(animate = true) {
    const total = vals.total, managed = Math.min(total, vals.officers * vals.per), unmanaged = Math.max(0, total - managed);
    const pct = total ? (unmanaged / total) * 100 : 0;
    set('total', fmt(total)); set('officers', fmt(vals.officers)); set('per', fmt(vals.per));
    set('managed', fmt(managed)); set('unmanaged', fmt(unmanaged));
    set('pct', Math.round(pct) + '%');
    set('sentence', `${fmt(unmanaged)} ${unmanaged === 1 ? 'donor' : 'donors'} (${Math.round(pct)}%)`);
    input_aria();
      if (!arc) return;
    if (!animate || REDUCED) { arc.setAttribute('stroke-dasharray', `${pct} 100`); shown.pct = pct; return; }
    gsap.to(shown, { pct, duration: .45, ease: 'power2.out', overwrite: true, onUpdate: () => arc.setAttribute('stroke-dasharray', `${shown.pct} 100`) });
  }
  function input_aria() { card.querySelectorAll('.veo-donut_input').forEach(i => i.setAttribute('aria-valuetext', fmt(+i.value))); }

  // first view: the arc sweeps in to the default share
  if (REDUCED || !arc) { render(false); return; }
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); render(); } }, { threshold: .35 });
  io.observe(card);
  render(false); arc.setAttribute('stroke-dasharray', '0 100'); shown.pct = 0;
}
