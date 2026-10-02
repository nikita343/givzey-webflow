// First-visit loader: the Givzey mark assembles like ink drops landing, then the hero's WebGL
// ink bleeds open from the centre (see hero-ink.js). Repeat visits in the same session skip it.
import { gsap } from 'gsap';
import { LOGO } from '../logo.js';
import { REDUCED } from '../base.js';

export function shouldIntro() {
  return document.documentElement.classList.contains('gz-intro') && !REDUCED;
}

export function playLoader() {
  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'gz-loader'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="gz-loader_mark">${LOGO}</div>`;
  document.body.appendChild(el);
  root.classList.add('gz-loader-on');
  root.classList.remove('gz-intro');   // the CSS placeholder hands over to the real loader
  try { sessionStorage.setItem('gz-intro', '1'); } catch { }

  const svg = el.querySelector('svg');
  const [symbol, word] = svg.querySelectorAll(':scope > g');
  const drops = symbol ? [...symbol.querySelectorAll('path')] : [];
  const letters = word ? [...word.querySelectorAll(':scope > g > path, :scope > g > g')] : [];
  gsap.set(drops, { transformOrigin: '50% 50%', scale: 0, opacity: 0 });
  gsap.set(letters, { opacity: 0, filter: 'blur(6px)' });

  const tl = gsap.timeline();
  tl.to(drops, { scale: 1, opacity: 1, duration: .7, ease: 'back.out(2.2)', stagger: { each: .09, from: 'end' } }, .05)
    .to(letters, { opacity: 1, filter: 'blur(0px)', duration: .55, ease: 'power2.out', stagger: .045 }, .3)
    .to(svg, { scale: 1.04, duration: .9, ease: 'sine.inOut' }, .3);
  return {
    // fade the mark and the backdrop; the hero shader keeps the dark base until its ink bleed opens it
    leave() {
      return gsap.timeline({ onComplete: () => { el.remove(); root.classList.remove('gz-loader-on'); } })
        .to(svg, { opacity: 0, scale: .96, filter: 'blur(8px)', duration: .45, ease: 'power2.in' })
        .to(el, { opacity: 0, duration: .5, ease: 'power1.out' }, '-=.15');
    },
    done: tl.then ? tl.then() : Promise.resolve()
  };
}
