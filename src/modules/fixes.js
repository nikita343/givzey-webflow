// Small page affordances that need a little script (Round 3 review).
export function initFixes() {
  resFilter();
  topicLinks();
  moreLists();
  wideFigures();
  postVideos();
  compareStack();
  // headings that break onto a second line on desktop with <br>: the break is hidden on phones (styles.css), so keep a
  // space in front of it or the two words run together ("waysthat")
  document.querySelectorAll('.cta_content h2 br').forEach(br => {
    const prev = br.previousSibling;
    if (!(prev && prev.nodeType === 3 && /\s$/.test(prev.textContent))) br.before(' ');
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

// Migrated posts: videos that were uploaded to Wix or HubSpot came across as a "Watch the video" link to the .mp4 file.
// Swap each one for an inline player (CMS rich text can't hold a <video>). The link stays as the fallback if the file fails.
function postVideos() {
  document.querySelectorAll('.post-rich a[href*=".mp4"]').forEach(a => {
    const p = a.closest('p'); if (!p || p.textContent.trim() !== a.textContent.trim()) return;
    const v = document.createElement('video');
    v.className = 'gz-post-video'; v.controls = true; v.preload = 'metadata'; v.playsInline = true;
    v.src = a.href; v.setAttribute('aria-label', 'Video');
    v.addEventListener('error', () => v.replaceWith(p), { once: true });
    const fig = document.createElement('figure');
    fig.className = 'gz-post-video-wrap'; fig.append(v);
    p.replaceWith(fig);
  });
}

// Comparison tables (Blackbaud vs Givzey): below 992px no sideways scrolling. The column-built table is read once and
// rebuilt as one block per row: the question, then Givzey and the other product side by side. CSS swaps the two.
function compareStack() {
  document.querySelectorAll('.bb-table').forEach(table => {
    if (table.nextElementSibling?.classList.contains('bb-stack')) return;
    const cols = [...table.querySelectorAll('.bb-col')];
    if (cols.length < 3) return;
    const cells = col => [...col.children].filter(c => c.classList.contains('bb-td'));
    const [labels, ...products] = cols;
    const names = products.map(c => c.querySelector('.bb-th')?.textContent.trim() || '');
    const stack = document.createElement('div');
    stack.className = 'bb-stack';
    stack.setAttribute('role', 'list');
    cells(labels).forEach((label, i) => {
      const row = document.createElement('div');
      row.className = 'bb-row';
      row.setAttribute('role', 'listitem');
      const head = document.createElement('div');
      head.className = 'bb-row_label';
      head.append(...[...label.childNodes].map(n => n.cloneNode(true)));
      const vals = document.createElement('div');
      vals.className = 'bb-row_vals';
      products.forEach((col, k) => {
        const cell = cells(col)[i];
        const v = document.createElement('div');
        v.className = 'bb-row_val' + (col.classList.contains('is-v2') ? ' is-v2' : '');
        const name = document.createElement('div');
        name.className = 'bb-row_name';
        // phones get the short name ("Blackbaud") so both captions stay on one line and the values line up
        name.innerHTML = '<span class="bb-row_full"></span><span class="bb-row_short"></span>';
        name.firstChild.textContent = names[k];
        name.lastChild.textContent = names[k].split(' ')[0];
        const body = document.createElement('div');
        body.className = 'bb-row_body';
        if (cell) body.append(...[...cell.childNodes].map(n => n.cloneNode(true)));
        v.append(name, body);
        vals.append(v);
      });
      row.append(head, vals);
      stack.append(row);
    });
    table.after(stack);
  });
}
