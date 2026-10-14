// Our story (/about): the timeline rail fills blue as you read down it, each year's mark fills when the
// line reaches it, and the dark statement lights up word by word with the scroll.
// Runs only when the page has the timeline (.ab-tl) or a statement (.ab-statement, Version2 mission, trust statements).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { REDUCED } from '../base.js';
import { claim } from './reveal.js';

const READ_LINE = 'top 62%';
const STATEMENTS = '.ab-statement, .v2r-mh, .sol-h2.is-statement';   // where on screen the "reading line" sits

function timeline(tl) {
  tl.classList.add('gz-tl');
  tl.querySelectorAll('.ab-line').forEach(line => {
    const fill = document.createElement('span');
    fill.className = 'ab-line_fill';
    line.appendChild(fill);
    if (REDUCED) { gsap.set(fill, { scaleY: 1 }); return; }
    gsap.fromTo(fill, { scaleY: 0 }, { scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: line, start: READ_LINE, end: 'bottom 62%', scrub: .5 } });
  });
  tl.querySelectorAll('.ab-mark').forEach(mark => {
    if (REDUCED) { mark.classList.add('is-reached'); return; }
    ScrollTrigger.create({ trigger: mark, start: 'center 62%',
      onEnter: () => mark.classList.add('is-reached'),
      onLeaveBack: () => mark.classList.remove('is-reached') });
  });
}

// two-tone statements light up word by word with the scroll and finish in ONE colour (Q.A.): the muted tail
// ("…with technology that propels them in their missions.") ends as white as the rest, on dark and on light bands
const MUTED = '.product-band_muted, .res-muted, .v2r-bmuted, .v2r-muted';
function statement(el) {
  claim(el);
  const full = getComputedStyle(el).color;
  const split = SplitText.create(el, { type: 'words', wordsClass: 'gz-sword', aria: 'auto' });
  const muted = split.words.filter(w => w.closest(MUTED) && el.contains(w.closest(MUTED)));
  if (REDUCED) { gsap.set(muted, { color: full }); return; }
  const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 85%', end: 'center 45%', scrub: .6 } });
  split.words.forEach((w, i) => {
    tl.fromTo(w, { opacity: .16 }, { opacity: 1, ease: 'none', duration: 1 }, i * .1);
    if (muted.includes(w)) tl.fromTo(w, { color: getComputedStyle(w).color }, { color: full, ease: 'none', duration: 1 }, i * .1);
  });
}

export function initAbout() {
  const tl = document.querySelector('.ab-tl');
  if (tl) timeline(tl);
  const statements = document.querySelectorAll(STATEMENTS);
  statements.forEach(statement);
  // page-height changes (lazy images) are re-measured globally in main.js (watchPageHeight)
}
