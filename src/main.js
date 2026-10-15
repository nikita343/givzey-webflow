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
import { initWaterHero } from './modules/ink-water.js';
import { headingBleed, fadeCopy, unrollTag, liveGradient, initReveals } from './modules/reveal.js';
import { initProductCards } from './modules/product-cards.js';
import { initStats, initStory, initCta } from './modules/sections.js';
import { initHovers } from './modules/hovers.js';
import { initTestimonials } from './modules/testimonials.js';
import { initNav } from './modules/nav.js';
import { initProduct } from './modules/product.js';
import { initVpgo } from './modules/vpgo.js';
import { initVso } from './modules/vso.js';
import { initGap } from './modules/gap.js';
import { initV2 } from './modules/v2.js';
import { initHubspotForms } from './modules/hubspot.js';
import { initAbout } from './modules/about.js';
import { initSecondary } from './modules/secondary.js';
import { initSolutions } from './modules/solutions.js';
import { initGuidance } from './modules/guidance.js';
import { initFixes } from './modules/fixes.js';

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

// Webflow sets html{height:100%}, so Lenis' own observer (on <html>) never sees the page grow when lazy images
// load: its scroll limit stayed at the first measurement and long pages stopped scrolling part-way (Version2).
// Watch <body> instead, re-measure Lenis at once and ScrollTrigger shortly after.
function watchPageHeight(lenis) {
  let h = document.body.scrollHeight, t = 0;
  new ResizeObserver(() => {
    const nh = document.body.scrollHeight;
    if (Math.abs(nh - h) < 2) return;
    h = nh; lenis?.resize();
    clearTimeout(t); t = setTimeout(() => ScrollTrigger.refresh(), 150);
  }).observe(document.body);
  addEventListener('load', () => lenis?.resize());
  // belt and braces: if the page outgrew the limit Lenis knows, re-measure (cheap; also covers background tabs
  // where ResizeObserver does not run, and the moment the wheel hits the stale end)
  const stale = () => lenis && document.documentElement.scrollHeight - innerHeight > lenis.limit + 2;
  setInterval(() => { if (!document.hidden && stale()) lenis.resize(); }, 1000);
  lenis?.on('scroll', () => { if (lenis.scroll >= lenis.limit - 4 && stale()) lenis.resize(); });
  addEventListener('visibilitychange', () => { if (!document.hidden && stale()) { lenis.resize(); ScrollTrigger.refresh(); } });
}

function heroSequence(hero) {
  const nav = document.querySelector('.navbar_component');
  const tag = hero.querySelector('.home-hero_tag');
  const h1 = hero.querySelector('h1');
  const text = hero.querySelector('.home-hero_text');
  const btn = hero.querySelector('.home-hero_button-wrapper');
  const tl = gsap.timeline({ paused: true });
  // clearProps: a leftover filter would turn the nav into a containing block and break the fixed mobile menu
  if (nav) tl.from(nav, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out', clearProps: 'filter,opacity' }, 0);
  if (tag) tl.add(unrollTag(tag, { trigger: null }).play(), .05);
  if (h1) tl.add(headingBleed(h1, { trigger: null, light: true }).play(), .15);
  if (h1) tl.add(liveGradient(h1), .15);
  if (text) tl.add(fadeCopy(text, { trigger: null }).play(), .55);
  if (btn) tl.from(btn, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out' }, .75);
  return tl;
}

async function boot() {
  // reserve the journey's pinned scroll length before any ScrollTrigger measures the page
  document.querySelector('.section_home-journey')?.classList.add('is-pinned');
  addEventListener('load', () => ScrollTrigger.refresh());
  const intro = shouldIntro();
  const loader = intro ? playLoader() : null;
  const hero = document.querySelector('.section_home-hero');
  const lenis = smoothScroll();
  window.gzLenis = lenis;   // the mobile menu pauses smooth scroll while it is open
  watchPageHeight(lenis);
  if (lenis && intro) lenis.stop();

  let heroTl = null;
  if (hero && !REDUCED) heroTl = heroSequence(hero);
  root.classList.add('gz-ready');   // content may show now; GSAP holds the initial states

  const ink = hero ? initWaterHero(hero, { intro }) : null;
  let inkReady = false;
  ink?.ready?.then(() => { inkReady = true; });
  if (intro && loader) {
    // the mark assembles on paper while the artwork loads; then the ink bleeds open from the centre
    await Promise.race([Promise.all([loader.done, ink?.ready]), new Promise(r => setTimeout(r, 2600))]);
    if (lenis) setTimeout(() => lenis.start(), 4500);   // never hold the scroll longer than this
    if (ink && ink.ok && inkReady) {
      ink.playIntro({
        onCover: () => loader.leave(),
        onReveal: () => { root.classList.remove('gz-intro'); heroTl && heroTl.play(); }
      }).then(() => lenis && lenis.start());
    } else { loader.dissolve(); heroTl && heroTl.play(); lenis && lenis.start(); }
  } else if (heroTl) heroTl.play();

  // each module is independent: one failing must not stop the rest
  for (const [name, fn] of Object.entries({ initHubspotForms, initNav, initReveals, initProductCards, initStats, initStory, initCta, initTestimonials, initProduct, initVpgo, initVso, initGap, initV2, initAbout, initSolutions, initGuidance, initFixes, initHovers, initSecondary })) {
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
  ScrollTrigger.refresh();
  log('motion ready');
}

const start = () => boot().catch(e => {
  console.error('[givzey]', e);
  document.querySelector('.gz-loader')?.remove();
  root.classList.add('gz-ready'); root.classList.remove('gz-intro', 'gz-loader-on');
});
document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', start) : start();
