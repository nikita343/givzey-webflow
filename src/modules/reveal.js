// Scroll reveals. Headings "bleed" in word by word (blur + ink-blue to navy), copy fades up from blur,
// tags unroll, and grids stagger. Everything is set from JS so the page still reads without it.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

const HEADINGS = '.heading-style-h1, .heading-style-h2, .home-press_heading, .home-story_title, .home-story_subheading';
const COPY = '.home-product_text, .home-hero_text, .home-story_text, .home-story_label, .cta_text, .home-journey_text, .footer_tagline';
const TAGS = '.tag, .home-logos_label, .home-stats_chip';

export function headingBleed(el, { delay = 0, trigger = el, start = 'top 85%', light = false } = {}) {
  const split = SplitText.create(el, { type: 'words', wordsClass: 'gz-word', aria: 'auto', ignore: '.home-hero_heading-gradient' });
  const from = light ? '#9CC4FF' : '#3E7BEF';
  // keep gradient text intact (hero "97% of your donors are unmanaged.")
  const words = split.words.filter(w => !w.closest('.home-hero_heading-gradient'));
  const tl = gsap.timeline({ paused: !!trigger, delay });
  const grad = [...el.querySelectorAll('.home-hero_heading-gradient')];
  const units = [...grad, ...split.words].sort((a, b) => a.compareDocumentPosition(b) & 2 ? 1 : -1);
  tl.from(units, { opacity: 0, filter: 'blur(14px)', duration: 1.1, ease: 'power3.out', stagger: .055 }, 0);
  if (words.length) tl.from(words, { color: from, duration: 1.4, ease: 'power2.out', stagger: .055, clearProps: 'color' }, 0);
  if (trigger) ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
  return tl;
}

export function fadeCopy(el, { delay = 0, trigger = el, start = 'top 88%' } = {}) {
  const tl = gsap.timeline({ paused: !!trigger, delay });
  tl.from(el, { opacity: 0, filter: 'blur(10px)', y: 14, duration: 1.1, ease: 'power3.out' });
  if (trigger) ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
  return tl;
}

export function unrollTag(el, { delay = 0, trigger = el, start = 'top 90%' } = {}) {
  const tl = gsap.timeline({ paused: !!trigger, delay });
  tl.fromTo(el, { clipPath: 'inset(0 100% 0 0 round 100vw)', opacity: 0 }, { clipPath: 'inset(0 0% 0 0 round 100vw)', opacity: 1, duration: .9, ease: 'expo.out', clearProps: 'clipPath' });
  if (trigger) ScrollTrigger.create({ trigger, start, once: true, onEnter: () => tl.play() });
  return tl;
}

export function initReveals(skip = new Set()) {
  document.querySelectorAll(HEADINGS).forEach(el => { if (!skip.has(el) && !el.closest('.section_home-hero, .home-journey_scene')) headingBleed(el, { light: !!el.closest('.home-story_inner') }); });
  document.querySelectorAll(COPY).forEach(el => { if (!skip.has(el) && !el.closest('.section_home-hero, .home-journey_scene')) fadeCopy(el); });
  document.querySelectorAll(TAGS).forEach(el => { if (!skip.has(el) && !el.closest('.section_home-hero, .home-journey_scene')) unrollTag(el); });

  // links / buttons under copy
  gsap.utils.toArray('.home-product_link, .home-story_link, .home-testimonials_arrows, .home-product_list-item').forEach((el, i) => {
    gsap.from(el, { opacity: 0, filter: 'blur(8px)', duration: .9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });

  // press logos: they develop like ink on paper
  const press = gsap.utils.toArray('.home-press_logo');
  if (press.length) gsap.fromTo(press, { opacity: 0, filter: 'blur(12px) grayscale(1)' }, { opacity: 1, filter: 'blur(0px) grayscale(0)', duration: 1.2, ease: 'power2.out', stagger: .12, clearProps: 'opacity,filter',
    onComplete: () => press.forEach(e => e.classList.add('is-in')),   // hover transitions only after the reveal, so CSS never fights GSAP
    scrollTrigger: { trigger: '.home-press_list', start: 'top 88%', once: true } });

  // footer
  const foot = gsap.utils.toArray('.footer_col, .footer_brand');
  if (foot.length) gsap.from(foot, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', stagger: .08, scrollTrigger: { trigger: '.footer_component', start: 'top 85%', once: true } });
}
