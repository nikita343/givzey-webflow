// Loader: a paper-white screen; the Givzey mark assembles like ink drops landing, then the hero's ink
// bleeds open from the centre (ink-water.js) and swallows the paper. The lockup uses difference blending,
// so it turns from ink-on-paper to white-on-ink as the bleed passes under it. Every homepage load;
// skipped with reduced motion.
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
  el.innerHTML = `<div class="gz-loader_mark">${LOGO}</div><div class="gz-loader_tag">Autonomous Fundraising</div>`;
  document.body.appendChild(el);
  root.classList.add('gz-loader-on');

  const svg = el.querySelector('svg'), tag = el.querySelector('.gz-loader_tag');
  const [symbol, word] = svg.querySelectorAll(':scope > g');
  const drops = symbol ? [...symbol.querySelectorAll('path')] : [];
  const letters = word ? [...word.querySelectorAll(':scope > g > path, :scope > g > g')] : [];
  gsap.set(drops, { transformOrigin: '50% 50%', scale: 0, opacity: 0 });
  gsap.set(letters, { opacity: 0, filter: 'blur(6px)' });
  gsap.set(tag, { opacity: 0, letterSpacing: '.3em' });

  const tl = gsap.timeline();
  tl.to(drops, { scale: 1, opacity: 1, duration: .7, ease: 'back.out(2.2)', stagger: { each: .09, from: 'end' } }, .1)
    .to(letters, { opacity: 1, filter: 'blur(0px)', duration: .55, ease: 'power2.out', stagger: .045 }, .35)
    .to(tag, { opacity: .8, letterSpacing: '.14em', duration: .9, ease: 'power3.out' }, .6)
    .to(svg, { scale: 1.04, duration: 1.1, ease: 'sine.inOut' }, .35);
  return {
    // the ink has covered the centre: the (now white) lockup dissolves into it
    leave() {
      return gsap.timeline({ onComplete: () => { el.remove(); root.classList.remove('gz-loader-on'); } })
        .to(el, { opacity: 0, filter: 'blur(10px)', scale: 1.04, duration: .9, ease: 'power2.inOut', delay: .35 });
    },
    // no ink engine: fade the paper away instead
    dissolve() {
      root.classList.remove('gz-intro');
      return gsap.to(el, { opacity: 0, duration: .5, onComplete: () => { el.remove(); root.classList.remove('gz-loader-on'); } });
    },
    done: tl.then()
  };
}
