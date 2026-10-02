// Stats, customer story and final CTA motion
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { inkLayer } from './ink-layer.js';
import { initInkSim } from './hero-ink.js';
import { REDUCED } from '../base.js';

// "$20M+" / "4x" / "43%" / "$1M+": count the number part, keep prefix and suffix
function countUp(el, { duration = 1.8, trigger = el } = {}) {
  const m = el.textContent.trim().match(/^([^\d]*)([\d.]+)(.*)$/); if (!m) return;
  const [, pre, num, post] = m, target = parseFloat(num), dec = (num.split('.')[1] || '').length;
  const o = { v: 0 };
  el.textContent = pre + (0).toFixed(dec) + post;
  gsap.to(o, { v: target, duration, ease: 'power3.out', scrollTrigger: { trigger, start: 'top 85%', once: true },
    onUpdate: () => { el.textContent = pre + o.v.toFixed(dec) + post; } });
}

export function initStats() {
  if (REDUCED) return;
  document.querySelectorAll('.home-stats_number').forEach(el => countUp(el));
  const cards = gsap.utils.toArray('.home-stats_card');
  if (cards.length) gsap.from(cards, { opacity: 0, filter: 'blur(12px)', duration: 1.1, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.home-stats_component', start: 'top 80%', once: true } });

  // chart: bars rise like ink filling a vial, then the milestone tooltip appears
  const chart = document.querySelector('.stats-chart');
  if (chart) {
    const bars = chart.querySelectorAll('.stats-chart_bar'), tip = chart.querySelector('.stats-chart_tip'), marker = chart.querySelector('.stats-chart_marker');
    gsap.set(bars, { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.set([tip, marker], { opacity: 0 });
    const tl = gsap.timeline({ paused: true });
    tl.to(bars, { scaleY: 1, duration: 1.1, ease: 'expo.out', stagger: .035 })
      .add(() => dispatchEvent(new Event('resize')))
      .to(marker, { opacity: 1, duration: .5 }, '-=.6')
      .to(tip, { opacity: 1, duration: .5 }, '-=.3');
    ScrollTrigger.create({ trigger: chart, start: 'top 82%', once: true, onEnter: () => tl.play() });
  }
}

export function initStory() {
  const inner = document.querySelector('.home-story_inner');
  if (!inner) return;
  // the card's two inks become one live fluid (same engine as the hero, on the card's navy):
  // they bleed in when the card arrives, the cursor stirs them and leaves a blue trail, drops fall now and then
  const NAVY = '#010B29';
  const sim = initInkSim(inner, { inkSel: '.home-story_ink', calmSel: '.home-story_intro', top: NAVY, bot: NAVY, bleedBase: NAVY, armed: !REDUCED, prepend: true, feel: { trailInk: .17, trailRadius: .55 } });   // a quieter trail than the hero: text sits on top
  if (REDUCED) return;
  const num = inner.querySelector('.home-story_number'); if (num) countUp(num, { duration: 2.2 });
  ScrollTrigger.create({ trigger: inner, start: 'top 75%', once: true, onEnter: () => {
    if (sim.ok) Promise.race([sim.ready, new Promise(r => setTimeout(r, 2500))]).then(() => sim.ok && sim.playIntro());
  } });
  const photo = inner.querySelector('.home-story_photo');
  if (photo) gsap.fromTo(photo, { scale: 1.12, yPercent: -3 }, { scale: 1, yPercent: 3, ease: 'none', scrollTrigger: { trigger: inner, start: 'top bottom', end: 'bottom top', scrub: true } });
  const logo = inner.querySelector('.home-story_logo');
  if (logo) gsap.from(logo, { opacity: 0, filter: 'blur(14px)', duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: logo, start: 'top 85%', once: true } });
}

export function initCta() {
  const box = document.querySelector('.cta_component');
  if (!box) return;
  // the blue pair (home) or the orange trio (VEO variant): only the inks the active variant shows come alive
  const shown = img => getComputedStyle(img).display !== 'none' && getComputedStyle(img.parentElement).display !== 'none';
  const ORIGINS = { 'is-bl': [0, 0], 'is-tr': [1, 1], 'is-wisp': [.3, .7] };
  const inks = [...box.querySelectorAll('.cta_ink, .cta_ink-orange')].filter(shown).map((img, i) => {
    const k = Object.keys(ORIGINS).find(c => img.classList.contains(c));
    return inkLayer(img, { host: box, origin: k ? ORIGINS[k] : (i ? [1, 0] : [0, 1]), seed: 9 + i });
  });
  if (REDUCED) { inks.forEach(l => l.setReveal(1)); return; }
  const o = { r: 0 };
  gsap.to(o, { r: 1, duration: 2.8, ease: 'power2.out', onUpdate: () => inks.forEach(l => l.setReveal(o.r)), scrollTrigger: { trigger: box, start: 'top 75%', once: true } });
  const haze = box.querySelector('.cta_haze');
  if (haze) gsap.from(haze, { opacity: 0, scale: .6, duration: 2, ease: 'power2.out', scrollTrigger: { trigger: box, start: 'top 75%', once: true } });
}
