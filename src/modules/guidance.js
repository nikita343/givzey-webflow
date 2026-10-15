// /guidance — live search over the question rows.
// Markup (Webflow): .gd2-search_input, .gd2-groups > div#topic (h2.gd2-group_title + .gd2-rows > .gd2-row…) + p.gd2-empty.
// The topic wrappers carry no class in Webflow, so they are found structurally and tagged .gd2-group here
// (that also gives them the scroll-margin the page CSS sets for .gd2-group).
// A query matches a row by its question/description, or every row of a topic whose title matches.
// Rows and topics without a match hide; "Nothing matches…" shows only when nothing at all matches.
const norm = s => (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

export function initGuidance() {
  const input = document.querySelector('.gd2-search_input');
  const wrap = document.querySelector('.gd2-groups');
  if (!input || !wrap) return;
  const groups = [...wrap.children].filter(g => g.querySelector('.gd2-row'));
  groups.forEach(g => g.classList.add('gd2-group'));
  const data = groups.map(g => ({
    g,
    title: norm(g.querySelector('.gd2-group_title')?.textContent),
    rows: [...g.querySelectorAll('.gd2-row')].map(r => ({ r, text: norm(r.textContent) })),
    link: document.querySelector(`.gd2-topic[href="#${g.id}"]`)
  }));
  const empty = wrap.querySelector('.gd2-empty');
  if (empty) { empty.setAttribute('role', 'status'); empty.setAttribute('aria-live', 'polite'); }
  if (!input.getAttribute('aria-label')) input.setAttribute('aria-label', 'Search guidance');

  const apply = () => {
    const q = norm(input.value);
    const words = q ? q.split(' ') : [];
    let any = false;
    data.forEach(({ g, title, rows, link }) => {
      const topicHit = !!q && words.every(w => title.includes(w));
      let shown = 0;
      rows.forEach(({ r, text }) => {
        const hit = !q || topicHit || words.every(w => text.includes(w));
        r.classList.toggle('is-hidden', !hit);
        if (hit) shown++;
      });
      g.classList.toggle('is-hidden', !!q && !shown);
      g.hidden = !!q && !shown;   // the page CSS hides .is-hidden groups only while filtering; this is unconditional
      link?.classList.toggle('is-muted', !!q && !shown);
      if (shown) any = true;
    });
    wrap.classList.toggle('is-filtering', !!q);
    wrap.classList.toggle('is-empty', !!q && !any);
    if (empty) empty.style.display = q && !any ? 'block' : '';
  };
  // the page's own inline script also listens; ours runs after it and has the final word
  input.addEventListener('input', () => queueMicrotask(apply));
  input.addEventListener('search', () => queueMicrotask(apply));
  input.addEventListener('keydown', e => { if (e.key === 'Escape' && input.value) { input.value = ''; apply(); } });
  if (input.value) apply();
}
