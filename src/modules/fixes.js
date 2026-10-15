// Small page affordances that need a little script (Round 3 review).
// Blackbaud comparison: on tablet / phone the table scrolls sideways inside its card; a quiet hint says so
// and fades once the visitor has scrolled it.
export function initFixes() {
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
