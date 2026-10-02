// Testimonials carousel (Swiper). The active slide opens into the full quote card with the ink border;
// the others sit as compact logo cards. Arrows, keyboard and click-to-open all work.
import Swiper from 'swiper';
import { A11y } from 'swiper/modules';
import { gsap } from 'gsap';
import { REDUCED } from '../base.js';

export function initTestimonials() {
  const el = document.querySelector('.home-testimonials_slider');
  if (!el) return;
  const prev = document.querySelector('.home-testimonials_arrow.is-prev');
  const next = document.querySelector('.home-testimonials_arrow:not(.is-prev)');
  el.classList.add('is-swiper');
  const swiper = new Swiper(el, {
    modules: [A11y],
    wrapperClass: 'home-testimonials_track',
    slideClass: 'home-testimonials_slide',
    slidesPerView: 'auto',
    spaceBetween: 32,
    speed: REDUCED ? 0 : 750,
    rewind: true,
    watchOverflow: false,        // all three slides fit in one row, which would otherwise lock navigation
    normalizeSlideIndex: false,  // ...and would snap every slideTo() back to the first card
    watchSlidesProgress: true,
    a11y: { slideLabelMessage: '{{index}} of {{slidesLength}}' },
    on: {
      // widths change with the active state, so Swiper re-measures once the CSS transition settles
      slideChangeTransitionStart(s) { clearTimeout(s._gzT); s._gzT = setTimeout(() => s.update(), 760); },
      slideChange(s) {
        const full = s.slides[s.activeIndex]?.querySelector('.home-testimonials_card');
        if (full && !REDUCED) gsap.fromTo(full.querySelectorAll('.home-testimonials_logo-wrap, .home-testimonials_quote, .home-testimonials_author'),
          { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: .8, ease: 'power2.out', stagger: .1, delay: .25 });
      }
    }
  });
  // Navigation is ours, not Swiper's: on desktop all three cards fit in one row, so Swiper sees
  // "already at the end" and slideNext would rewind to the first card. slideTo(index) always works.
  const n = swiper.slides.length;
  const go = i => swiper.slideTo(((i % n) + n) % n);
  prev && prev.addEventListener('click', e => { e.preventDefault(); go(swiper.activeIndex - 1); });
  next && next.addEventListener('click', e => { e.preventDefault(); go(swiper.activeIndex + 1); });
  el.addEventListener('click', e => {
    const slide = e.target.closest('.home-testimonials_slide');
    if (slide && !slide.classList.contains('swiper-slide-active')) go(swiper.slides.indexOf(slide));
  });
  let inView = false;
  new IntersectionObserver(es => { inView = es[0].isIntersecting; }, { threshold: .4 }).observe(el);
  addEventListener('keydown', e => {
    if (!inView || e.target.closest?.('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'ArrowRight') go(swiper.activeIndex + 1);
    else if (e.key === 'ArrowLeft') go(swiper.activeIndex - 1);
  });
  return swiper;
}
