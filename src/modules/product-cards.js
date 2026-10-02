// Product rows: the card wipes open, its ink blooms from the corner and then lives (drifts, reacts
// to the cursor), and the mock conversation plays out message by message with typing dots.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { inkLayer } from './ink-layer.js';
import { REDUCED } from '../base.js';

function typingDots() {
  const t = document.createElement('div');
  t.className = 'gz-typing'; t.setAttribute('aria-hidden', 'true');
  t.innerHTML = '<i></i><i></i><i></i>';
  return t;
}

// Every message keeps its final place from the start (only opacity animates), so the card never
// changes height or re-centres while the conversation plays. Typing dots float in the slot of the
// message that is about to arrive instead of pushing the layout around.
function chatSequence(list) {
  const tl = gsap.timeline();
  if (getComputedStyle(list).position === 'static') list.style.position = 'relative';
  list.querySelectorAll(':scope > .gz-typing').forEach(d => d.remove());
  [...list.children].forEach(el => {
    if (el.classList.contains('mock-time')) { tl.from(el, { opacity: 0, duration: .5 }, 0); return; }
    const donor = el.classList.contains('is-donor');
    if (!donor) {
      const dots = typingDots(); list.appendChild(dots);
      gsap.set(dots, { position: 'absolute', margin: 0, autoAlpha: 0 });
      tl.call(() => gsap.set(dots, { left: el.offsetLeft, top: el.offsetTop }), null, '+=.15')
        .fromTo(dots, { autoAlpha: 0, scale: .6, transformOrigin: '0% 100%' }, { autoAlpha: 1, scale: 1, duration: .25 }, '<')
        .to(dots, { autoAlpha: 0, scale: .9, duration: .2 }, '+=.75');
    }
    tl.fromTo(el, { opacity: 0, scale: .96, filter: 'blur(6px)', transformOrigin: donor ? '100% 100%' : '0% 100%' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .55, ease: 'power3.out', clearProps: 'filter,transform' }, donor ? '+=.45' : '-=.12');
    const inner = el.querySelector('.mock-linkcard, .mock-video');
    if (inner) tl.from(inner, { opacity: 0, filter: 'blur(6px)', duration: .5, ease: 'power2.out', clearProps: 'filter' }, '-=.15');
  });
  return tl;
}

function emailSequence(card) {
  const tl = gsap.timeline();
  const parts = [card.querySelector('.mock-email_header'), ...card.querySelectorAll('.mock-email_body > *'), card.querySelector('.mock-email_reply')].filter(Boolean);
  parts.forEach((el, i) => {
    tl.from(el, { opacity: 0, filter: 'blur(6px)', duration: .5, ease: 'power2.out' }, i ? '+=.12' : 0);
  });
  const btn = card.querySelector('.mock-email_button');
  if (btn) tl.fromTo(btn, { boxShadow: '0 0 0 0 rgba(34,100,27,.45)' }, { boxShadow: '0 0 0 14px rgba(34,100,27,0)', duration: 1.1, ease: 'power2.out' }, '-=1.4');
  return tl;
}

export function initProductCards() {
  document.querySelectorAll('.home-product_visual').forEach((visual, idx) => {
    const ink = visual.querySelector('.home-product_ink');
    const card = visual.querySelector('.mock-card');
    const persona = visual.querySelector('.home-product_persona');
    const isRight = ink && ink.classList.contains('is-vso');
    const layer = ink ? inkLayer(ink, { host: visual, origin: isRight ? [1, 1] : [0, 1], seed: idx * 3.1 }) : null;
    if (REDUCED) { layer && layer.setReveal(1); return; }

    const tl = gsap.timeline({ paused: true });
    tl.fromTo(visual, { clipPath: 'inset(6% 6% 6% 6% round 2.5rem)' }, { clipPath: 'inset(0% 0% 0% 0% round 1.75rem)', duration: 1.3, ease: 'expo.out', clearProps: 'clipPath' }, 0);
    if (layer) { const o = { r: 0 }; tl.to(o, { r: 1, duration: 2.4, ease: 'power2.out', onUpdate: () => layer.setReveal(o.r) }, .15); }
    if (card) {
      tl.from(card, { opacity: 0, filter: 'blur(12px)', scale: .96, duration: 1, ease: 'power3.out' }, .45);
      const header = card.querySelector('.mock-card_header');
      if (header) tl.from(header.children, { opacity: 0, duration: .5, stagger: .08 }, .8);
      const chat = card.querySelector('.mock-messages');
      if (chat) tl.add(chatSequence(chat), 1.1);
      else tl.add(emailSequence(card), .9);
    }
    if (persona) {
      tl.from(persona, { opacity: 0, scale: .7, rotate: -8, filter: 'blur(10px)', duration: 1.1, ease: 'back.out(1.4)' }, '-=1.2');
      gsap.to(persona, { y: -8, rotate: 6, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    }
    ScrollTrigger.create({ trigger: visual, start: 'top 72%', once: true, onEnter: () => tl.play() });
  });

  // VSO checklist: the check marks pop in like ink stamps
  gsap.utils.toArray('.home-product_check').forEach(c => {
    gsap.from(c, { scale: 0, rotate: -30, opacity: 0, duration: .6, ease: 'back.out(2.4)', scrollTrigger: { trigger: c, start: 'top 92%', once: true } });
  });
}
