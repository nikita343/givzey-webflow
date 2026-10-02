// Givzey — site motion. Loaded from Vercel into Webflow:
//   <link rel="stylesheet" href="https://givzey-webflow.vercel.app/givzey.css">   (head)
//   <script type="module" src="https://givzey-webflow.vercel.app/givzey.js"></script>   (before </body>)
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { REDUCED } from './base.js';
import { shouldIntro, playLoader } from './modules/loader.js';
import { initHeroInk } from './modules/hero-ink.js';
import { headingBleed, fadeCopy, unrollTag, initReveals } from './modules/reveal.js';
import { initProductCards } from './modules/product-cards.js';
import { initStats, initStory, initCta } from './modules/sections.js';
import { initHovers } from './modules/hovers.js';
import { initTestimonials } from './modules/testimonials.js';
import { initNav } from './modules/nav.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
const root = document.documentElement;
const log = (...a) => console.info('%c[givzey]', 'color:#045CE8', ...a);

function smoothScroll() {
  if (REDUCED || matchMedia('(hover: none)').matches) return null;
  const lenis = new Lenis({ lerp: .11, wheelMultiplier: .95 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

function heroSequence(hero) {
  const nav = document.querySelector('.navbar_component');
  const tag = hero.querySelector('.home-hero_tag');
  const h1 = hero.querySelector('h1');
  const text = hero.querySelector('.home-hero_text');
  const btn = hero.querySelector('.home-hero_button-wrapper');
  const tl = gsap.timeline({ paused: true });
  if (nav) tl.from(nav, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out' }, 0);
  if (tag) tl.add(unrollTag(tag, { trigger: null }).play(), .05);
  if (h1) tl.add(headingBleed(h1, { trigger: null, light: true }).play(), .15);
  if (text) tl.add(fadeCopy(text, { trigger: null }).play(), .55);
  if (btn) tl.from(btn, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out' }, .75);
  return tl;
}

async function boot() {
  const intro = shouldIntro();
  const loader = intro ? playLoader() : null;
  const hero = document.querySelector('.section_home-hero');
  const lenis = smoothScroll();
  if (lenis && intro) lenis.stop();

  let heroTl = null;
  if (hero && !REDUCED) heroTl = heroSequence(hero);
  root.classList.add('gz-ready');   // content may show now; GSAP holds the initial states

  const ink = hero ? initHeroInk(hero, { intro }) : null;
  if (intro && loader) {
    await Promise.race([Promise.all([loader.done, ink?.ready]), new Promise(r => setTimeout(r, 2600))]);
    loader.leave();
    if (ink && ink.ok) ink.playIntro(() => heroTl && heroTl.play()).then(() => lenis && lenis.start());
    else { heroTl && heroTl.play(); lenis && lenis.start(); }
  } else if (heroTl) heroTl.play();

  // each module is independent: one failing must not stop the rest
  for (const [name, fn] of Object.entries({ initNav, initReveals, initProductCards, initStats, initStory, initCta, initTestimonials, initHovers })) {
    try { fn(); } catch (e) { console.error('[givzey]', name, e); }
  }

  // the 3D journey (three.js + 1 MB figure) only loads when its section is near
  const journey = document.querySelector('.section_home-journey');
  if (journey) {
    const io = new IntersectionObserver(async es => {
      if (!es[0].isIntersecting) return; io.disconnect();
      const { initJourney } = await import('./modules/journey/index.js');
      await initJourney(journey); ScrollTrigger.refresh();
    }, { rootMargin: '150% 0px' });
    io.observe(journey);
  }
  addEventListener('load', () => ScrollTrigger.refresh());
  log('motion ready');
}

const start = () => boot().catch(e => {
  console.error('[givzey]', e);
  document.querySelector('.gz-loader')?.remove();
  root.classList.add('gz-ready'); root.classList.remove('gz-intro', 'gz-loader-on');
});
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
