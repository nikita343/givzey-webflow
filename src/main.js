// Givzey — site motion. Loaded from Vercel into Webflow:
//   <link rel="stylesheet" href="https://givzey-webflow.vercel.app/givzey.css">   (head)
//   <script type="module" src="https://givzey-webflow.vercel.app/givzey.js"></script>   (before </body>)
import './styles.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { REDUCED } from './base.js';
import { shouldIntro, playLoader, revealMode } from './modules/loader.js';
import { initHomeHero } from './modules/home-hero.js';
import { LOGO } from './logo.js';
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
import { initDonorJourney } from './modules/donor-journey.js';
import { initPhones } from './modules/phones.js';
import { initVeoDonut } from './modules/veo-donut.js';
import { initConsent } from './modules/consent.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
const root = document.documentElement;
const RESOURCES = /^\/(blog|news|events|webinars|guides|case-studies|guidance|press)(\/|$)/.test(location.pathname);
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
  // the copy first (headline, subhead, button), then the nav and the rest of the site (Loom 15 Oct)
  if (tag) tl.add(unrollTag(tag, { trigger: null }).play(), 0);
  if (h1) tl.add(headingBleed(h1, { trigger: null, light: true }).play(), .05);
  if (h1) tl.add(liveGradient(h1), .05);
  if (text) tl.add(fadeCopy(text, { trigger: null }).play(), .45);
  if (btn) tl.from(btn, { opacity: 0, filter: 'blur(10px)', duration: 1, ease: 'power2.out' }, .65);
  // clearProps: a leftover filter would turn the nav into a containing block and break the fixed mobile menu
  if (nav) tl.from(nav, { opacity: 0, filter: 'blur(10px)', y: -8, duration: 1, ease: 'power2.out', clearProps: 'filter,opacity,transform' }, .9);
  return tl;
}

async function boot() {
  // reserve the journey's pinned scroll length before any ScrollTrigger measures the page
  document.querySelector('.section_home-journey')?.classList.add('is-pinned');
  addEventListener('load', () => ScrollTrigger.refresh());
  const hero = document.querySelector('.section_home-hero');
  // the loader plays from the top of the page (a reload would otherwise restore the scroll under it)
  const intro = shouldIntro() && !!hero;
  if (intro) { try { history.scrollRestoration = 'manual'; } catch (e) {} scrollTo(0, 0); }
  else root.classList.remove('gz-intro');
  const loader = intro ? playLoader() : null;
  const lenis = smoothScroll();
  window.gzLenis = lenis;   // the mobile menu pauses smooth scroll while it is open
  watchPageHeight(lenis);
  if (lenis && intro) lenis.stop();

  let heroTl = null;
  if (hero && !REDUCED) heroTl = heroSequence(hero);
  root.classList.add('gz-ready');   // content may show now; GSAP holds the initial states

  const ink = hero ? initHomeHero(hero, { intro }) : null;
  if (intro && loader) {
    // hard cap: whatever happens (hidden tab, weak GPU), the page is free 4 s after boot; normally the intro ends at ~3 s
    let played = false;
    const playHero = () => { if (!played) { played = true; heroTl && heroTl.play(); } };
    const release = () => { loader.remove(); root.classList.remove('gz-intro', 'gz-bleeding'); ink && ink.endIntro && ink.endIntro(); playHero(); lenis && lenis.start(); };
    const inkV1 = revealMode() === 'ink';   // Header V1 reveal: the lockup stays under the bleeding ink, then fades
    const cap = setTimeout(release, inkV1 ? 5200 : 4000);
    if (ink && ink.ok) ink.prepareLogo(LOGO);
    // symbol, then wordmark, then a short hold
    await Promise.race([loader.done, new Promise(r => setTimeout(r, 1450))]);
    await new Promise(r => setTimeout(r, 60));
    if (ink && ink.ok) {
      ink.burst(loader.svg, {
        onStamp: () => { if (inkV1) root.classList.add('gz-bleeding'); else loader.burst(); },
        onReveal: () => { if (inkV1) loader.fade(); playHero(); },
        onUncover: () => { root.style.setProperty('--gz-cover-top', Math.max(0, Math.round(hero.getBoundingClientRect().bottom)) + 'px'); root.classList.add('gz-intro-fade'); root.classList.remove('gz-intro'); if (!inkV1) loader.remove(); setTimeout(() => root.classList.remove('gz-intro-fade'), 900); }
      }).then(() => { clearTimeout(cap); release(); });
    } else { loader.dissolve(); playHero(); setTimeout(() => { clearTimeout(cap); release(); }, 500); }
  } else if (heroTl) heroTl.play();
  // QA: replay the loader on the page (?gzdebug)
  if (/[?&]gzdebug\b/.test(location.search)) window.__gzGsap = gsap;
  if (ink && ink.ok && /[?&]gzdebug\b/.test(location.search)) window.__gzReplay = () => {
    scrollTo(0, 0); root.classList.add('gz-intro'); ink.cover(); const l = playLoader(); ink.prepareLogo(LOGO);
    const v1 = revealMode() === 'ink';
    return l.done.then(() => new Promise(r => setTimeout(r, 120))).then(() => ink.burst(l.svg, { onStamp: () => { if (v1) root.classList.add('gz-bleeding'); else l.burst(); }, onReveal: () => { if (v1) l.fade(); }, onUncover: () => { root.classList.remove('gz-intro'); if (!v1) l.remove(); } })).then(() => { l.remove(); root.classList.remove('gz-bleeding'); });
  };

  // resources (hubs + every item page): no scroll reveals at all, content is simply there (Q.A. round 4);
  // hovers, forms, search and the final CTA ink (shown at once) still run
  const mods = { initPhones, initVeoDonut, initHubspotForms, initNav, initReveals, initProductCards, initStats, initStory, initCta, initTestimonials, initProduct, initVpgo, initVso, initGap, initV2, initAbout, initSolutions, initGuidance, initFixes, initHovers, initSecondary, initDonorJourney };
  if (RESOURCES) {
    root.classList.add('gz-static');
    for (const k of Object.keys(mods)) if (!['initHubspotForms', 'initNav', 'initProduct', 'initGuidance', 'initFixes', 'initHovers'].includes(k)) delete mods[k];
    mods.initCta = () => initCta({ instant: true });
  }
  mods.initConsent = initConsent;   // every page, resources included
  // each module is independent: one failing must not stop the rest
  for (const [name, fn] of Object.entries(mods)) {
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
