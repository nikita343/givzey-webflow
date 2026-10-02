// Testimonials carousel (Swiper). The active slide opens into the full quote card with the ink border;
// the others sit as compact logo cards. Arrows, keyboard, drag and click-to-open all work.
import Swiper from 'swiper';
import { Navigation, Keyboard, A11y } from 'swiper/modules';
import { gsap } from 'gsap';
import { REDUCED } from '../base.js';

export function initTestimonials() {
  const el = document.querySelector('.home-testimonials_slider');
  if (!el) return;
  const prev = document.querySelector('.home-testimonials_arrow.is-prev');
  const next = document.querySelector('.home-testimonials_arrow:not(.is-prev)');
  el.classList.add('is-swiper');
  const swiper = new Swiper(el, {
    modules: [Navigation, Keyboard, A11y],
    wrapperClass: 'home-testimonials_track',
    slideClass: 'home-testimonials_slide',
    slidesPerView: 'auto',
    spaceBetween: 32,
    speed: REDUCED ? 0 : 750,
    rewind: true,
    slideToClickedSlide: true,
    watchSlidesProgress: true,
    grabCursor: true,
    keyboard: { enabled: true, onlyInViewport: true },
    navigation: { prevEl: prev, nextEl: next },
    a11y: { prevSlideMessage: 'Previous testimonial', nextSlideMessage: 'Next testimonial' },
    on: {
      // widths change with the active state, so Swiper re-measures once the CSS transition settles
      slideChangeTransitionStart(s) { clearTimeout(s._gzT); s._gzT = setTimeout(() => s.update(), 760); },
      slideChange(s) {
        const full = s.slides[s.activeIndex]?.querySelector('.home-testimonials_full');
        if (full && !REDUCED) gsap.fromTo(full.querySelectorAll('.home-testimonials_logo-wrap, .home-testimonials_quote, .home-testimonials_author'),
          { opacity: 0, filter: 'blur(10px)' }, { opacity: 1, filter: 'blur(0px)', duration: .8, ease: 'power2.out', stagger: .1, delay: .25 });
      }
    }
  });
  [prev, next].forEach(a => a && a.addEventListener('click', e => e.preventDefault()));
  return swiper;
}
