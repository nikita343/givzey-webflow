// Our story (/about): the timeline rail fills blue as you read down it, each year's mark fills when the
// line reaches it, and the dark statement lights up word by word with the scroll.
// Runs only when the page has the timeline (.ab-tl) or the statement (.ab-statement).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { REDUCED } from '../base.js';

const READ_LINE = 'top 62%';   // where on screen the "reading line" sits

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

function statement(el) {
  if (REDUCED) return;
  const split = SplitText.create(el, { type: 'words', wordsClass: 'gz-sword', aria: 'auto' });
  gsap.fromTo(split.words, { opacity: .16 }, { opacity: 1, ease: 'none', stagger: .1,
    scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 42%', scrub: .6 } });
}

export function initAbout() {
  const tl = document.querySelector('.ab-tl');
  if (tl) timeline(tl);
  document.querySelectorAll('.ab-statement').forEach(statement);
}
