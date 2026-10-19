// Small page affordances that need a little script (Round 3 review).
// Blackbaud comparison: on tablet / phone the table scrolls sideways inside its card; a quiet hint says so
// and fades once the visitor has scrolled it.
export function initFixes() {
  resFilter();
  topicLinks();
  moreLists();
  wideFigures();
  document.querySelectorAll('.bb-table').forEach(table => {
    if (table.previousElementSibling?.classList.contains('gz-swipe-hint')) return;
    const hint = document.createElement('div');
    hint.className = 'gz-swipe-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.innerHTML = '<span>Swipe to compare</span><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
    table.before(hint);
    const update = () => {
      const scrollable = table.scrollWidth - table.clientWidth > 4;
      hint.style.display = scrollable ? '' : 'none';
      if (table.scrollLeft > 24) hint.classList.add('is-done');
    };
    table.addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    update();
  });
}

// Resource filter bar (blog, news, events, customer stories): it is sticky, and carries its hairline only while it
// is stuck over the list (a sentinel just above it scrolls out of view). Its height is published as --gz-filter-h
// so the blog's sticky Guidance promo can sit just below it.
function resFilter() {
  const bar = document.querySelector('.section_res-filter');
  if (!bar) return;
  const root = document.documentElement;
  const setH = () => root.style.setProperty('--gz-filter-h', bar.offsetHeight + 'px');
  setH();
  if ('ResizeObserver' in window) new ResizeObserver(setH).observe(bar);
  if (!('IntersectionObserver' in window) || bar.previousElementSibling?.classList.contains('gz-filter-sentinel')) return;
  const sentinel = document.createElement('div');
  sentinel.className = 'gz-filter-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  sentinel.style.cssText = 'height:1px;margin-bottom:-1px;pointer-events:none';
  bar.before(sentinel);
  // the bar sticks at the top edge, or under the navbar while that is shown: watch the sentinel against that line
  let io, last = -1;
  const watch = () => {
    const top = root.classList.contains('gz-nav-scrolled') && !root.classList.contains('gz-nav-hidden') ? parseFloat(getComputedStyle(root).getPropertyValue('--gz-nav-h')) || 0 : 0;
    if (top === last) return;   // <html> class changes often (Lenis); only the sticky line matters
    last = top; io?.disconnect();
    io = new IntersectionObserver(([e]) => bar.classList.toggle('is-stuck', !e.isIntersecting && e.boundingClientRect.top < innerHeight / 2),
      { rootMargin: `-${Math.round(top) + 1}px 0px 0px 0px` });
    io.observe(sentinel);
  };
  watch();
  new MutationObserver(watch).observe(root, { attributes: true, attributeFilter: ['class'] });
}

// "All pledge articles" and friends point at /blog?topic=…#latest. On /blog itself Webflow treats that as a same-page
// hash link and swallows the click, so nothing happened (launch tracker 19 Oct). Same page: switch the tab and glide
// down to the list instead of navigating.
const slug = s => (s || '').toLowerCase().trim().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function topicLinks() {
  if (!document.querySelector('.res-tab')) return;
  document.addEventListener('click', e => {
    const a = e.target.closest?.('a[href*="topic="]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;
    const t = u.searchParams.get('topic');
    const tab = [...document.querySelectorAll('.res-tab')].find(b => (b.getAttribute('data-filter') || slug(b.textContent)) === t);
    if (!tab) return;
    e.preventDefault(); e.stopImmediatePropagation();
    tab.click();
    const target = document.getElementById(u.hash.slice(1) || 'latest') || document.querySelector('.section_res-filter');
    if (!target) return;
    const css = getComputedStyle(document.documentElement);
    const off = (parseFloat(css.getPropertyValue('--gz-filter-h')) || 0) + (parseFloat(css.getPropertyValue('--gz-nav-h')) || 0) + 8;
    if (window.gzLenis) window.gzLenis.scrollTo(target, { offset: -off, duration: 1.2 });
    else target.scrollIntoView({ behavior: 'smooth' });
  }, true);
}

// Templates: the "More stories / news / events" list never points back at the page you are on; when that leaves it
// empty the whole section goes (launch tracker 19 Oct).
function moreLists() {
  const here = location.pathname.replace(/\/$/, '');
  document.querySelectorAll('.section_post-more').forEach(sec => {
    sec.querySelectorAll('.w-dyn-item').forEach(it => {
      const a = it.matches('a') ? it : it.querySelector('a[href]');
      if (a && new URL(a.href, location.href).pathname.replace(/\/$/, '') === here) it.remove();
    });
    if (!sec.querySelector('.w-dyn-item')) sec.style.display = 'none';
  });
}

// Article images: anything drawn at article width or larger fills the column; small images (logos, icons,
// screenshots of a detail) keep their own size so they never blur (launch tracker 19 Oct).
function wideFigures() {
  document.querySelectorAll('.post-rich figure.w-richtext-figure-type-image, .post-rich figure[data-rt-type=image]').forEach(fig => {
    const img = fig.querySelector('img'); if (!img) return;
    const set = () => fig.classList.toggle('gz-fig-wide', img.naturalWidth >= 600);
    img.complete ? set() : img.addEventListener('load', set, { once: true });
  });
}
