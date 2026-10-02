// Gift Agreement Platform page: Jordan's signed agreement in the hero (shared chat()), the commitment-to-close
// lifecycle, the four capability scenes, the six levels of giving and the William & Mary proof band.
// Every function is a no-op when its section is absent, so the module is safe on every page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { countTo } from './product.js';
import { REDUCED } from '../base.js';

const once = (trigger, start, fn) => ScrollTrigger.create({ trigger, start, once: true, onEnter: fn });
const blurIn = { opacity: 0, filter: 'blur(8px)' };
// handwriting: the signature is revealed left to right like a pen stroke
const write = (el, tl, at, duration = 1.1) => el && tl.fromTo(el, { clipPath: 'inset(-20% 100% -20% 0%)' }, { clipPath: 'inset(-20% 0% -20% 0%)', duration, ease: 'power1.inOut', clearProps: 'clipPath' }, at);

/* ---------- hero: the signature writes itself once the card has landed ---------- */
function heroSignature() {
  const sig = document.querySelector('.section_product-hero .product-chat_signature'); if (!sig || REDUCED) return;
  const tl = gsap.timeline({ delay: 1.6 });
  write(sig, tl, 0, 1.2);
}

/* ---------- lifecycle: drafted → reviewed → approved → signed → booked, then the speed comparison ---------- */
function lifecycle() {
  const card = document.querySelector('.gap-life_card'); if (!card || REDUCED) return;
  const doc = card.querySelector('.gap-life_doc'), sheets = card.querySelectorAll('.gap-life_sheet');
  const chips = ['is-drafted', 'is-reviewed', 'is-approved', 'is-booked'].map(c => card.querySelector('.gap-life_chip.' + c)).filter(Boolean);
  const rows = card.querySelectorAll('.gap-life_row'), statuses = card.querySelectorAll('.gap-life_status');
  const sig = card.querySelector('.gap-life_signature'), line = card.querySelector('.gap-life_sign-line');
  const panel = card.querySelector('.gap-life_panel');
  const dash = card.querySelector('.gap-life_dash'), wait = card.querySelector('.gap-life_speed.is-pdf .gap-life_pill');
  const fill = card.querySelector('.gap-life_fill'), done = card.querySelector('.gap-life_pill.is-blue');
  const nums = [...card.querySelectorAll('.gap-life_stat-num')];
  const glow = card.querySelector('.gap-life_glow');

  gsap.set(chips, { opacity: 0, scale: .8, y: 10 });
  const tl = gsap.timeline({ paused: true });
  tl.from(sheets, { rotate: 0, opacity: 0, duration: 1, ease: 'expo.out', stagger: .08 }, 0)
    .from(doc, { y: 30, opacity: 0, filter: 'blur(12px)', duration: 1, ease: 'power3.out', clearProps: 'filter,transform' }, .1)
    .from(rows, { opacity: 0, x: -10, duration: .5, stagger: .1, ease: 'power2.out', clearProps: 'transform' }, .5)
    .from(statuses, { opacity: 0, scale: .6, duration: .45, stagger: .1, ease: 'back.out(2.4)', clearProps: 'transform' }, .7);
  // each approval lands as a chip around the document
  chips.forEach((c, i) => tl.to(c, { opacity: 1, scale: 1, y: 0, duration: .55, ease: 'back.out(2)', clearProps: 'transform' }, .55 + i * .38 + (i === 3 ? .6 : 0)));
  if (line) tl.from(line, { scaleX: 0, transformOrigin: '0% 50%', duration: .6, ease: 'power2.out' }, 1.4);
  write(sig, tl, 1.55, 1.1);

  // speed: PDFs crawl and never arrive, the Smart Gift Agreement lands almost at once
  if (panel) tl.from(panel.children, { ...blurIn, y: 10, duration: .7, stagger: .08, ease: 'power2.out', clearProps: 'filter,transform' }, .4);
  if (dash) tl.from(dash, { scaleX: 0, transformOrigin: '0% 50%', duration: 2.6, ease: 'power1.out' }, .9);
  if (wait) tl.from(wait, { opacity: 0, x: -8, duration: .5 }, 3.2).add(() => gsap.to(wait, { opacity: .45, duration: 1, yoyo: true, repeat: -1, ease: 'sine.inOut' }), 3.8);
  if (fill) tl.from(fill, { scaleX: 0, transformOrigin: '0% 50%', duration: .4, ease: 'power3.out' }, 1.2);
  if (done) tl.from(done, { opacity: 0, scale: .7, x: -12, duration: .6, ease: 'back.out(2.2)', clearProps: 'transform' }, 1.45);
  nums.forEach((n, i) => tl.add(() => countTo(n, { duration: 1.6, trigger: null }), 1.5 + i * .12));
  if (glow) gsap.fromTo(glow, { xPercent: -6, yPercent: 4 }, { xPercent: 6, yPercent: -4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  once(card, 'top 75%', () => tl.play());
}

/* ---------- capabilities ---------- */
function capabilities() {
  if (REDUCED) return;
  const scene = (sel, fn) => document.querySelectorAll(sel).forEach(el => { const tl = fn(el); if (tl) once(el, 'top 82%', () => tl.play()); });

  // 1 · templates fan out, the cursor picks the multi-year pledge
  scene('.gap-cap_tpl.is-main', main => {
    const frame = main.parentElement;
    const back = frame.querySelectorAll('.gap-cap_tpl:not(.is-main)'), cursor = frame.querySelector('.gap-cap_cursor');
    const use = main.querySelector('.gap-cap_use'), chip = frame.querySelector('.gap-cap_chip');
    const tl = gsap.timeline({ paused: true });
    tl.from(back, { rotate: 0, x: (i) => [70, -70, 40, -40][i] || 0, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: .06 }, .1)
      .from(main, { y: 26, opacity: 0, scale: .94, duration: .9, ease: 'back.out(1.6)', clearProps: 'transform' }, .25)
      .from(chip, { opacity: 0, y: -8, duration: .6, ease: 'power2.out', clearProps: 'transform' }, .5);
    if (cursor) tl.from(cursor, { x: 70, y: 40, opacity: 0, duration: .9, ease: 'power3.out' }, .9)
      .to(cursor, { scale: .82, duration: .12, yoyo: true, repeat: 1, transformOrigin: '20% 10%' }, 1.8)
      .to(use, { scale: .96, duration: .12, yoyo: true, repeat: 1 }, 1.8)
      .to(main, { boxShadow: '0 1.5rem 3rem rgba(10,41,128,.22), 0 0 0 .35rem rgba(30,99,233,.18)', duration: .5, yoyo: true, repeat: 1 }, 1.9);
    return tl;
  });

  // 2 · workflow: steps tick through, the director's note arrives and gets resolved
  scene('.gap-cap_steps', steps => {
    const frame = steps.parentElement, comment = frame.querySelector('.gap-cap_comment');
    const icons = steps.querySelectorAll('.gap-cap_step-icon'), now = steps.querySelector('.gap-cap_step-dot');
    const revised = comment?.querySelector('.gap-cap_revised');
    const tl = gsap.timeline({ paused: true });
    tl.from(steps, { ...blurIn, y: 16, duration: .9, ease: 'power3.out', clearProps: 'filter,transform' }, .1)
      .from(icons, { scale: 0, duration: .45, ease: 'back.out(2.6)', stagger: .22, clearProps: 'transform' }, .4)
      .from(comment, { opacity: 0, x: 30, rotate: 3, duration: .9, ease: 'expo.out', clearProps: 'transform' }, 1)
      .from(revised, { opacity: 0, y: 6, duration: .5, ease: 'power2.out', clearProps: 'transform' }, 1.7);
    if (now) tl.add(() => gsap.to(now, { scale: 1.6, opacity: .5, duration: .9, yoyo: true, repeat: -1, ease: 'sine.inOut' }), 1.2);
    return tl;
  });

  // 3 · reminders: the statement fills in, the reminder toast slides out and the bell rings now and then
  scene('.gap-cap_statement', st => {
    const frame = st.parentElement, toast = frame.querySelector('.gap-cap_toast'), bell = toast?.querySelector('svg');
    const segs = st.querySelectorAll('.gap-cap_seg'), methods = st.querySelectorAll('.gap-cap_method'), pay = st.querySelector('.gap-cap_pay');
    const tl = gsap.timeline({ paused: true });
    tl.from(st, { ...blurIn, y: 20, duration: .9, ease: 'power3.out', clearProps: 'filter,transform' }, .1)
      .from(segs, { scaleX: 0, transformOrigin: '0% 50%', duration: .6, ease: 'power2.out', stagger: .15 }, .5)
      .from(methods, { opacity: 0, y: 6, duration: .4, stagger: .06, ease: 'power2.out', clearProps: 'transform' }, .8)
      .from(pay, { opacity: 0, scale: .94, duration: .5, ease: 'back.out(2)', clearProps: 'transform' }, 1)
      .from(toast, { opacity: 0, x: -40, duration: .8, ease: 'expo.out', clearProps: 'transform' }, 1.2);
    if (bell) tl.add(() => gsap.timeline({ repeat: -1, repeatDelay: 3.2 })
      .to(bell, { rotate: 14, duration: .1, transformOrigin: '50% 10%' }).to(bell, { rotate: -12, duration: .1 }).to(bell, { rotate: 8, duration: .1 }).to(bell, { rotate: 0, duration: .15 }), 1.6);
    return tl;
  });

  // 4 · hub: rows load in, then the filters cycle and the matching agreement lights up
  scene('.gap-cap_hub-card', hub => {
    const rows = [...hub.querySelectorAll('.gap-cap_hub-row')], filters = [...hub.querySelectorAll('.gap-cap_filter')];
    const tl = gsap.timeline({ paused: true });
    tl.from(hub, { ...blurIn, y: 16, duration: 1, ease: 'power3.out', clearProps: 'filter,transform' }, .1)
      .from(rows, { opacity: 0, y: 10, duration: .55, stagger: .12, ease: 'power2.out', clearProps: 'transform' }, .45);
    // All → Awaiting (Alex) → Renewals (Sam)
    const focus = [null, 1, 2];
    tl.add(() => {
      let i = 0;
      setInterval(() => {
        if (document.hidden) return;
        i = (i + 1) % filters.length;
        filters.forEach((f, j) => f.classList.toggle('is-on', j === i));
        rows.forEach((r, j) => gsap.to(r, { opacity: focus[i] == null || focus[i] === j ? 1 : .3, duration: .4 }));
      }, 2400);
    }, 1.6);
    return tl;
  });
}

/* ---------- levels of giving: each mock acts out its use case ---------- */
function uses() {
  if (REDUCED) return;
  document.querySelectorAll('.gap-use_card').forEach(card => {
    const scene = card.querySelector('.gap-use_scene > *'); if (!scene) return;
    const tl = gsap.timeline({ paused: true });
    tl.from(scene, { ...blurIn, y: 14, scale: .97, duration: .9, ease: 'power3.out', clearProps: 'filter,transform' }, .15);
    const bars = scene.querySelectorAll('.gap-use_bar');
    if (bars.length) tl.from(bars, { scaleX: 0, transformOrigin: '0% 50%', duration: .45, stagger: .08, ease: 'power2.out' }, .5);
    const amount = scene.querySelector('.gap-use_amount'); if (amount) tl.add(() => countTo(amount, { duration: 1.4, trigger: null }), .4);
    const big = scene.querySelector('.gap-use_big'); if (big) tl.from(big, { scale: .5, opacity: 0, duration: .8, ease: 'back.out(2.4)', clearProps: 'transform' }, .35);
    const pill = scene.querySelector('.gap-use_pill'); if (pill) tl.from(pill, { opacity: 0, x: -8, duration: .5, clearProps: 'transform' }, .8);
    const arc = scene.querySelector('.gap-use_ring-arc');
    if (arc) { const L = 2 * Math.PI * 29; gsap.set(arc, { strokeDasharray: L, strokeDashoffset: L }); tl.to(arc, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, .4); }
    const label = scene.querySelector('.gap-use_ring-label'); if (label) tl.add(() => countTo(label, { duration: 1.4, trigger: null }), .4);
    const av = scene.querySelectorAll('.gap-use_avatar'); if (av.length) tl.from(av, { scale: 0, duration: .4, stagger: .07, ease: 'back.out(2.6)', clearProps: 'transform' }, .55);
    write(scene.querySelector('.gap-use_signature'), tl, .6, 1);
    const ok = scene.querySelector('.gap-use_ok'); if (ok) tl.from(ok, { opacity: 0, scale: .6, duration: .45, ease: 'back.out(2.4)', clearProps: 'transform' }, 1.5);
    const fills = scene.querySelectorAll('.gap-use_fill'); if (fills.length) tl.from(fills, { scaleX: 0, transformOrigin: '0% 50%', duration: .9, stagger: .12, ease: 'power3.out' }, .45);
    const years = scene.querySelectorAll('.gap-use_year'); if (years.length) tl.from(years, { opacity: 0, y: 6, duration: .4, stagger: .1, ease: 'power2.out', clearProps: 'transform' }, .7);
    if (scene.classList.contains('gap-use_member')) tl.from(scene, { rotate: -4, duration: 1, ease: 'expo.out' }, .15);
    once(card, 'top 85%', () => tl.play());
  });
}

/* ---------- proof band: the ink drifts behind the glass, the result develops ---------- */
function proof() {
  const card = document.querySelector('.product-band_card.is-blue'); if (!card || REDUCED) return;
  const glass = card.querySelector('.product-band_glass'), ink = card.querySelector('.product-band_ink');
  if (ink) gsap.fromTo(ink, { scale: 1.12, yPercent: -4 }, { scale: 1, yPercent: 4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  if (!glass) return;
  const tl = gsap.timeline({ paused: true });
  tl.from(glass, { opacity: 0, filter: 'blur(14px)', duration: 1.2, ease: 'power3.out', clearProps: 'filter' }, .2)
    .from(glass.querySelectorAll(':scope > :not(.product-band_lead)'), { opacity: 0, y: 12, filter: 'blur(6px)', duration: .8, stagger: .1, ease: 'power2.out', clearProps: 'filter,transform' }, .4);
  once(card, 'top 65%', () => tl.play());
}

export function initGap() {
  if (!document.querySelector('.product-hero_visual.is-gap')) return;
  for (const fn of [heroSignature, lifecycle, capabilities, uses, proof]) {
    try { fn(); } catch (e) { console.error('[givzey] gap', fn.name, e); }
  }
}
