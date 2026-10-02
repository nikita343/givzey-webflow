// "One donor, a whole year of care." — pinned scroll story with the 3D figure
import { SEASONS, REDUCE, clamp, sstep, seasonAt, rgb, rgba, mix } from './seasons.js';
import { Person3D, loadFigure } from './scene3d.js';
import { ASSET } from '../../base.js';

const SC = [{ a: 0, b: .15 }, { a: .15, b: .37 }, { a: .37, b: .59 }, { a: .59, b: .80 }, { a: .80, b: .93 }, { a: .93, b: 1.01 }];

export async function initJourney(section) {
  const sticky = section.querySelector('.home-journey_sticky');
  if (!sticky) return;
  const bg = sticky.querySelector('.home-journey_bg');
  const haze = sticky.querySelector('.home-journey_haze');
  const scenes = [...sticky.querySelectorAll('.home-journey_scene')];
  const months = [...sticky.querySelectorAll('.home-journey_month')];
  const fill = sticky.querySelector('.home-journey_fill');
  const dot = sticky.querySelector('.home-journey_dot');
  const paper = sticky.querySelector('.home-journey_paper');
  const fallback = sticky.querySelector('.home-journey_visual');

  section.classList.add('is-pinned');
  const inkUrls = Object.fromEntries(SEASONS.map(s => [s.ink, ASSET(`journey/ink-${s.ink}.webp`)]));

  let gl = null;
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (hasGL && !REDUCE) {
    try {
      const geo = await loadFigure(ASSET('journey/figure.gz'));
      gl = Person3D(sticky, geo, inkUrls);
      section.classList.add('is-3d');
      requestAnimationFrame(() => gl && gl.canvas.classList.add('is-in'));
    } catch (e) { console.warn('[givzey] journey 3D disabled', e); }
  }

  let geo = null;
  function layout() {
    const W = sticky.clientWidth, H = sticky.clientHeight, narrow = W < 820;
    geo = { W, H, narrow };
    if (gl) gl.layout(W, H, { cx: narrow ? .5 : .66, figFrac: narrow ? .62 : .96, T: narrow ? { x: W * .5, y: H * .62 } : { x: W * .7, y: H * .52 }, closeFov: narrow ? 24 : 20, sway: 8, azOff: narrow ? -6 : -14 });
  }
  layout();
  addEventListener('resize', layout);

  const progress = () => {
    const r = section.getBoundingClientRect(); const total = r.height - innerHeight;
    return { p: clamp(-r.top / Math.max(1, total)), visible: r.top < innerHeight && r.bottom > 0 };
  };

  let last = -1, lastPaper = null;
  function frame(t) {
    const { p, visible } = progress(); if (!visible) return;
    const v = sstep(.35, .40, p) + sstep(.57, .62, p) + sstep(.78, .83, p);
    const s = seasonAt(Math.min(v, 3));
    if (bg) bg.style.background = `radial-gradient(120% 90% at 70% 60%, ${rgb(mix(s.bg, [255, 255, 255], .35))} 0%, ${rgb(s.bg)} 60%, ${rgb(mix(s.bg, [3, 11, 44], .03))} 100%)`;
    section.style.setProperty('--journey-acc', rgb(s.acc));
    section.style.setProperty('--journey-hz', rgba(mix(s.bg, [255, 255, 255], .2), .9));
    const z = sstep(.07, .17, p) * (1 - sstep(.92, .985, p));
    let si = SC.findIndex(x => p >= x.a && p < x.b); if (si < 0) si = 5;
    const sp = (p - SC[si].a) / (SC[si].b - SC[si].a);
    if (gl) gl.update(t, s, v, z, si, sp);
    if (si !== last) { scenes.forEach((e, i) => e.classList.toggle('is-active', i === si)); last = si; }
    const showPaper = si === 3 && sp > .36;
    if (paper && showPaper !== lastPaper) { paper.classList.toggle('is-active', showPaper); lastPaper = showPaper; }
    if (paper && gl && showPaper) {
      const pr = gl.phoneRect();
      if (geo.narrow) { paper.style.left = Math.max(12, geo.W / 2 - 150) + 'px'; paper.style.top = Math.min(geo.H - 260, pr.y + pr.h * .62) + 'px'; }
      else { paper.style.left = Math.max(12, pr.x - 250) + 'px'; paper.style.top = (pr.y + pr.h * .42) + 'px'; }
    }
    const mp = clamp((p - .15) / (.93 - .15));
    if (fill) fill.style.width = (mp * 100) + '%';
    if (dot) dot.style.left = (mp * 100) + '%';
    const m = Math.min(11, Math.floor(mp * 12));
    months.forEach((e, i) => e.classList.toggle('is-active', i <= m && p > .15));
  }

  let inView = false;
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { rootMargin: '200px 0px' }).observe(section);
  const t0 = performance.now();
  const tick = now => { if (inView) frame((now - t0) / 1000); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  if (haze) haze.dataset.ready = '1';
  if (fallback && gl) fallback.setAttribute('aria-hidden', 'true');
}
