// Loader (Loom 15 Oct): a full-screen dark-blue screen; the Givzey symbol lands in the centre, then the wordmark
// writes in beside it; a short hold; then the lockup bursts into ink (home-hero.js stamps it into the fluid and
// blows it apart) and the bleed floods outward to reveal the hero. Every homepage load; skipped with reduced motion.
import { gsap } from 'gsap';
import { LOGO } from '../logo.js';
import { REDUCED } from '../base.js';

// Which reveal plays after the lockup (Nick 16 Oct tried both; client tracker 19 Oct: "full logo should animate in,
// then burst away into the ink splash style" -> burst is the default again):
//   'ink'   = Header V1: the screen is paper, the ink bleeds out from the logo in stepped frames and swallows it;
//             the lockup is drawn in difference blend, so it reads dark on paper and turns white as the ink passes under it
//   'burst' = the logo is stamped into the fluid and blown apart over a dark screen (15 Oct build)
// Default below; any page can be forced with ?reveal=ink or ?reveal=burst.
export const REVEAL_DEFAULT = 'burst';
export function revealMode() {
  const m = /[?&]reveal=(ink|burst)\b/.exec(location.search);
  return m ? m[1] : REVEAL_DEFAULT;
}

export function shouldIntro() {
  return document.documentElement.classList.contains('gz-intro') && !REDUCED;
}

export function playLoader() {
  const root = document.documentElement;
  const el = document.createElement('div');
  el.className = 'gz-loader'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="gz-loader_mark">${LOGO}</div>`;
  document.body.appendChild(el);
  const mode = revealMode();
  root.classList.remove('gz-reveal-ink', 'gz-reveal-burst');
  root.classList.add('gz-loader-on', 'gz-reveal-' + mode);

  const mark = el.querySelector('.gz-loader_mark'), svg = el.querySelector('svg');
  const [symbol, word] = svg.querySelectorAll(':scope > g');
  const drops = symbol ? [...symbol.querySelectorAll('path')] : [];
  const letters = word ? [...word.querySelectorAll(':scope > g > path, :scope > g > g')] : [];
  gsap.set(drops, { transformOrigin: '50% 50%', scale: 0, opacity: 0 });
  gsap.set(letters, { opacity: 0, x: -5, filter: 'blur(5px)' });

  const tl = gsap.timeline();
  // the symbol: its three drops land one after another (dot last)
  tl.to(drops, { scale: 1, opacity: 1, duration: .62, ease: 'back.out(2.1)', stagger: { each: .08, from: 'end' } }, .08)
    // then "Givzey" writes in, letter by letter
    .to(letters, { opacity: 1, x: 0, filter: 'blur(0px)', duration: .45, ease: 'power2.out', stagger: .05 }, .5)
    // a slow breath while it holds, so the burst has something to break
    .to(mark, { scale: 1.035, duration: 1.05, ease: 'sine.inOut' }, .25);

  let gone = false;
  const remove = () => { if (gone) return; gone = true; el.remove(); root.classList.remove('gz-loader-on'); };
  return {
    svg,
    done: tl.then(),
    // the ink copy of the logo is in the canvas now: the DOM lockup flashes away on top of it
    burst() { tl.kill(); gsap.to(mark, { opacity: 0, scale: 1.09, filter: 'blur(3px)', duration: .24, ease: 'power2.in' }); },
    remove,
    // V1: the lockup stays while the ink swallows it, then fades out as the hero copy comes in
    fade() { tl.kill(); return gsap.to(mark, { opacity: 0, duration: .35, ease: 'power1.out', onComplete: remove }); },
    // no ink engine: the lockup and the cover simply fade
    dissolve() {
      tl.kill();
      return gsap.timeline({ onComplete: remove })
        .to(mark, { opacity: 0, scale: 1.06, filter: 'blur(8px)', duration: .45, ease: 'power2.in' })
        .add(() => root.classList.remove('gz-intro'));
    }
  };
}
