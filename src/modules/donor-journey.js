// Home: "One donor, a whole year of care." Pinned scroll story ported from Wes's donor-journey prototype
// (client tracker 26 Oct). Copy and the notification cards live in Webflow (.section_dj); this module adds the
// artwork (served next to givzey.js), the timeline controls, and drives the scenes from the scroll position.
import { ASSET } from '../base.js';

const IMG = p => ASSET(`journey2/${p}`);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SEASONS = [['Winter', .20], ['Spring', .40], ['Summer', .59], ['Fall', .77]];
const NAMES = ['Donor journey', 'Winter: text message', 'Spring: email', 'Summer: handwritten card', 'Fall: renewal', 'A year later'];
const STARTS = [0, .16, .35, .54, .73, .91];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, p) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const el = (tag, cls, attrs = {}) => { const n = document.createElement(tag); if (cls) n.className = cls; for (const k in attrs) n.setAttribute(k, attrs[k]); return n; };
const img = (src, cls, alt = '') => { const i = el('img', cls, { src: IMG(src), alt, decoding: 'async' }); return i; };

function artwork(box) {
  box.textContent = '';
  const scene = (cls, ...imgs) => { const d = el('div', `dj-photo ${cls}`); imgs.forEach(i => d.appendChild(i)); box.appendChild(d); return d; };
  const ink = img('dj-ink-painted-sharper.webp', 'dj-ink'); box.appendChild(ink);
  const wide = scene('is-wide', img('dj-donor-cutout-edited.webp'));
  const phone = scene('is-phone', img('dj-donor-closeup.webp'));
  const mailbox = scene('is-mailbox', img('dj-mailbox.webp'));
  const group = scene('is-group', img('dj-ink-finale.webp', 'dj-group-ink'), img('dj-donor-group-final-cutout.webp', 'dj-group-people'));
  return { ink, wide, phone, mailbox, group };
}

function lettering(sec) {
  sec.querySelectorAll('[data-dj-letter]').forEach(slot => {
    if (slot.querySelector('img')) return;
    slot.appendChild(img(`dj-note-${slot.getAttribute('data-dj-letter')}.svg`, 'dj-letter-img', slot.getAttribute('data-dj-alt') || ''));
  });
}

export function initDonorJourney() {
  const sec = document.querySelector('.section_dj'); if (!sec) return;
  const stage = sec.querySelector('.dj-stage'); if (!stage) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const art = artwork(sec.querySelector('.dj-artwork'));
  lettering(sec);
  const copies = [...sec.querySelectorAll('[data-copy]')];
  const notes = [...sec.querySelectorAll('[data-note]')];
  const fill = sec.querySelector('.dj-fill'), thumb = sec.querySelector('.dj-thumb'), track = sec.querySelector('.dj-track');

  // controls are built here: Webflow has no native button/range for this
  const seasonsBox = sec.querySelector('.dj-seasons'), monthsBox = sec.querySelector('.dj-months');
  SEASONS.forEach(([name, p]) => { const b = el('button', 'dj-season', { type: 'button' }); b.textContent = name; b.addEventListener('click', () => seek(p)); seasonsBox?.appendChild(b); });
  const monthBtns = MONTHS.map((m, i) => { const b = el('button', 'dj-month', { type: 'button', 'aria-label': `Go to ${m}` }); b.textContent = m; b.addEventListener('click', () => seek(.16 + (i / 11) * .72)); monthsBox?.appendChild(b); return b; });
  const scrub = el('input', 'dj-scrub', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Journey progress', 'aria-valuetext': NAMES[0] });
  track?.appendChild(scrub);

  let current = -1, frame = 0, px = 0, py = 0, mx = 0, my = 0;
  const top = () => sec.getBoundingClientRect().top + scrollY;
  const dist = () => Math.max(1, sec.offsetHeight - stage.offsetHeight);
  const progress = () => clamp((scrollY - top()) / dist());
  function seek(p) {
    const y = top() + clamp(p) * dist();
    if (window.gzLenis) window.gzLenis.scrollTo(y, { immediate: true, force: true }); else scrollTo({ top: y, behavior: 'instant' });
    tickSoon();
  }
  function setScene(i) {
    if (i === current) return; current = i; stage.dataset.scene = String(i);
    copies.forEach((c, n) => { const on = n === i; c.classList.toggle('is-on', on); c.setAttribute('aria-hidden', String(!on)); c.inert = !on; });
    notes.forEach(c => { const on = Number(c.dataset.note) === i; c.classList.toggle('is-on', on); c.setAttribute('aria-hidden', String(!on)); c.inert = !on; });
    scrub.setAttribute('aria-valuetext', NAMES[i]);
  }
  function render(p) {
    let i = -1; STARTS.forEach((s, n) => { if (p >= s) i = n; }); setScene(Math.max(0, i));
    const rm = reduced.matches, year = clamp((p - .16) / .72);
    if (fill) fill.style.width = `${year * 100}%`;
    if (thumb) thumb.style.left = `${year * 100}%`;
    scrub.value = String(Math.round(p * 1000));
    monthBtns.forEach((b, n) => { const on = n === Math.round(year * 11); b.classList.toggle('is-current', on); on ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'); });
    // full figure zooms and crossfades into the phone close-up
    const close = rm ? (p >= .16 ? 1 : 0) : smooth(.025, .20, p);
    const phoneMix = smooth(.23, .94, close);
    art.wide.style.opacity = String(1 - phoneMix);
    art.phone.style.opacity = String(phoneMix);
    // the mailbox only behind the summer card
    art.mailbox.style.opacity = String(rm ? Number(i === 3) : smooth(STARTS[3], STARTS[3] + .02, p) * (1 - smooth(STARTS[4] - .02, STARTS[4], p)));
    // closes on the group, never back to the opening portrait
    art.group.style.opacity = String(rm ? Number(i === 5) : smooth(.875, .99, p));
    const mobile = innerWidth <= 600;
    art.wide.style.transform = `scale(${rm ? 1 : 1 + close * .75})`;
    art.phone.style.transform = `scale(${rm ? 1 : 1 + clamp((p - .2) / .67) * .035})`;
    art.ink.style.opacity = String(.85 * (1 - close));
    stage.style.setProperty('--mx', `${rm || mobile ? 0 : mx}px`);
    stage.style.setProperty('--my', `${rm || mobile ? 0 : my}px`);
  }
  function tick() {
    frame = 0; mx += (px - mx) * .08; my += (py - my) * .08;
    render(progress());
    if (Math.abs(px - mx) > .05 || Math.abs(py - my) > .05) tickSoon();
  }
  function tickSoon() { if (!frame) frame = requestAnimationFrame(tick); }
  scrub.addEventListener('input', () => seek(Number(scrub.value) / 1000));
  addEventListener('scroll', tickSoon, { passive: true });
  addEventListener('resize', tickSoon);
  window.gzLenis?.on('scroll', tickSoon);
  stage.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' || reduced.matches) return;
    const r = stage.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width - .5) * 28; py = ((e.clientY - r.top) / r.height - .5) * 22; tickSoon();
  });
  stage.addEventListener('pointerleave', () => { px = 0; py = 0; tickSoon(); });
  sec.classList.add('is-ready');
  tickSoon();
}
