// HubSpot forms, embedded as raw HTML and styled by the site (see "HubSpot forms" in styles.css).
//
// Webflow markup — one host per form:
//   <div class="hs-embed" data-hs-form="<formId>"
//        data-hs-submit="Request a demo"            optional button label
//        data-hs-chips="vertical,demo_product_choice" optional: selects shown as chips
//        data-hs-event="demo_request_submit"         optional: dataLayer event on submit
//        data-hs-hide="firstname,lastname"           optional: leave optional fields out of a compact form
//        data-hs-thanks="You’re in.">                optional: replaces HubSpot's thank-you text
// Host classes: is-inline (field + button on one row, labels hidden), is-dark (dark surfaces).
//     <p class="hs-embed_fallback">…</p>              optional: shown only if HubSpot fails to load
//   </div>
// The portal is the same for every Givzey form. Submissions, redirects and notifications stay as
// configured in HubSpot; this module only changes how the fields look and read.
const PORTAL = '21907434';
const REGION = 'na1';
const SRC = 'https://js.hsforms.net/forms/embed/v2.js';

// Site voice (sentence case). Values sent to HubSpot are untouched.
const LABELS = {
  firstname: 'First name', lastname: 'Last name', email: 'Work email', phone: 'Phone',
  company: 'Organization', jobtitle: 'Job title', vertical: 'Organization type',
  state_province: 'State or province', demo_product_choice: 'What would you like to see?',
  country: 'Country', message: 'Message'
};
const PLACEHOLDERS = {
  firstname: 'Jane', lastname: 'Doe', email: 'jane@university.edu', phone: '(555) 555-0123',
  company: 'Organization name', jobtitle: 'e.g. Director of Annual Giving', message: 'How can we help?'
};
const OPTION_LABELS = {
  'Higher Ed': 'Higher education', 'Independent School': 'Independent school',
  'Mission-based Non-profit': 'Nonprofit', 'Autonomous AI Fundraising': 'Autonomous fundraising'
};
const HIDDEN_OPTIONS = new Set(['Non-lead']);   // internal routing value, not something a visitor picks

let loading = null;
function loadHubspot() {
  if (window.hbspt?.forms) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SRC; s.async = true; s.charset = 'utf-8';
    s.onload = () => (window.hbspt?.forms ? resolve() : reject(new Error('hbspt missing')));
    s.onerror = () => reject(new Error('HubSpot embed blocked or offline'));
    document.head.appendChild(s);
  });
  return loading;
}

function preconnect() {
  for (const href of ['https://js.hsforms.net', 'https://forms.hsforms.com', 'https://forms.hsforms.net']) {
    if (document.querySelector(`link[rel="preconnect"][href="${href}"]`)) continue;
    const l = document.createElement('link'); l.rel = 'preconnect'; l.href = href; l.crossOrigin = '';
    document.head.appendChild(l);
  }
}

// React owns these inputs: set through the native setter, then tell React with real events
function setNativeValue(el, value) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

const CHECK = '<svg class="gz-chip_check" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.5-5.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function chipify(field) {
  const select = field.querySelector('select');
  if (!select || field.querySelector('.gz-chips')) return;
  const label = field.querySelector('label');
  const opts = [...select.options].filter(o => o.value && !o.disabled && !HIDDEN_OPTIONS.has(o.value));
  if (!opts.length || opts.length > 6) return;
  const group = document.createElement('div');
  group.className = 'gz-chips';
  group.setAttribute('role', 'radiogroup');
  if (label?.id) group.setAttribute('aria-labelledby', label.id);
  const chips = opts.map(o => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'gz-chip'; b.dataset.value = o.value;
    b.setAttribute('role', 'radio');
    b.innerHTML = CHECK + `<span>${OPTION_LABELS[o.value] || o.text}</span>`;
    group.appendChild(b);
    return b;
  });
  const sync = () => chips.forEach((c, i) => {
    const on = c.dataset.value === select.value;
    c.setAttribute('aria-checked', on);
    c.tabIndex = on || (!select.value && i === 0) ? 0 : -1;
  });
  const pick = (chip, focus) => {
    setNativeValue(select, chip.dataset.value);
    sync(); if (focus) chip.focus();
  };
  group.addEventListener('click', e => { const c = e.target.closest('.gz-chip'); if (c) pick(c); });
  group.addEventListener('keydown', e => {
    const i = chips.indexOf(document.activeElement); if (i < 0) return;
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); pick(chips[(i + step + chips.length) % chips.length], true); }
    else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); pick(chips[i]); }
  });
  select.addEventListener('change', sync);
  // the select stays in the form (HubSpot reads and validates it); the chips are its face
  // (hidden in CSS by structure: React rewrites the select's className on every change)
  select.tabIndex = -1; select.setAttribute('aria-hidden', 'true');
  label?.addEventListener('click', e => { e.preventDefault(); (chips.find(c => c.tabIndex === 0) || chips[0]).focus(); });
  select.closest('.input').appendChild(group);
  field.classList.add('is-chips');
  sync();
}

function dress(host, form) {
  form.querySelectorAll('.hs-form-field').forEach(field => {
    const input = field.querySelector('input:not([type=hidden]), select, textarea');
    const name = input?.name;
    const span = field.querySelector(':scope > label > span:first-child');
    if (span && LABELS[name] && span.textContent !== LABELS[name]) span.textContent = LABELS[name];
    if (input && PLACEHOLDERS[name] && !input.placeholder) input.placeholder = PLACEHOLDERS[name];
    if (input?.tagName === 'SELECT') {
      field.classList.add('is-select');
      const ph = input.querySelector('option[disabled][value=""]'); if (ph && ph.textContent !== 'Select') ph.textContent = 'Select';
      [...input.options].forEach(o => { if (HIDDEN_OPTIONS.has(o.value) && !o.hidden) o.hidden = true; });
    }
  });
  // compact forms: drop optional fields (never required ones — HubSpot would refuse the submission)
  const hide = (host.dataset.hsHide || '').split(',').map(x => x.trim()).filter(Boolean);
  hide.forEach(n => {
    const f = form.querySelector(`.hs_${n}`);
    if (!f || f.querySelector('[required]')) return;
    if (!f.hidden) f.hidden = true;
    if (!f.classList.contains('gz-hidden')) f.classList.add('gz-hidden');
    const fs = f.closest('fieldset');
    if (fs && !fs.hidden && [...fs.querySelectorAll('.hs-form-field')].every(x => x.hidden)) fs.hidden = true;
  });
  if (host.classList.contains('is-inline')) {
    // placeholders carry the label visually; the label stays for screen readers
    form.querySelectorAll('.hs-form-field > label:not(.gz-sr-only)').forEach(l => l.classList.add('gz-sr-only'));
  }
  const chipNames = (host.dataset.hsChips || '').split(',').map(s => s.trim()).filter(Boolean);
  chipNames.forEach(n => { const f = form.querySelector(`.hs_${n}`); if (f) chipify(f); });

  const submit = form.querySelector('input[type=submit], button[type=submit]');
  if (submit && host.dataset.hsSubmit) {
    if (submit.tagName === 'INPUT') { if (submit.value !== host.dataset.hsSubmit) submit.value = host.dataset.hsSubmit; }
    else if (submit.textContent !== host.dataset.hsSubmit) submit.textContent = host.dataset.hsSubmit;
  }
  if (form.querySelector('.hs_recaptcha') && !host.querySelector('.gz-form_captcha')) {
    const note = document.createElement('p');
    note.className = 'gz-form_captcha';
    note.innerHTML = 'Protected by reCAPTCHA. Google’s <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacy Policy</a> and <a href="https://policies.google.com/terms" target="_blank" rel="noopener">Terms of Service</a> apply.';
    form.after(note);
  }
}

let uid = 0;
function mount(host) {
  if (host.dataset.hsMounted) return;
  host.dataset.hsMounted = '1';
  const formId = host.dataset.hsForm;
  const target = document.createElement('div');
  target.className = 'hs-embed_target';
  target.id = `gz-hs-${++uid}`;
  host.appendChild(target);

  const fail = () => host.classList.add('is-failed');
  const timer = setTimeout(fail, 12000);
  loadHubspot().then(() => {
    window.hbspt.forms.create({
      portalId: PORTAL, formId, region: REGION, target: `#${target.id}`,
      css: '',                                   // raw HTML, no HubSpot theme: the site styles it
      cssClass: 'gz-form', submitButtonClass: 'gz-form_submit', errorClass: 'is-error', errorMessageClass: 'gz-form_error',
      formInstanceId: target.id,
      onFormReady: $f => {
        clearTimeout(timer);
        // our own target first: several instances of one form share HubSpot's element id
        const form = target.querySelector('form') || $f?.[0];
        if (!form) return;
        const run = () => { try { dress(host, form); } catch (e) { console.error('[givzey] hubspot dress', e); } };
        run();
        // HubSpot keeps re-rendering fields after "ready" (phone widget, validation); dress again each time.
        // Every write in dress() is guarded, so this settles after one pass.
        let queued = false;
        new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; run(); }); })
          .observe(form, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'placeholder', 'hidden'] });
        host.classList.add('is-ready');
      },
      onFormSubmit: () => host.classList.add('is-sending'),
      onFormSubmitted: () => {
        host.classList.remove('is-sending'); host.classList.add('is-sent');
        if (host.dataset.hsThanks) {
          // HubSpot swaps the form for its message a tick later
          const swap = () => { const m = host.querySelector('.submitted-message'); if (m) { m.textContent = host.dataset.hsThanks; return true; } };
          if (!swap()) { const mo = new MutationObserver(() => swap() && mo.disconnect()); mo.observe(host, { childList: true, subtree: true }); setTimeout(() => mo.disconnect(), 5000); }
        }
        (window.dataLayer = window.dataLayer || []).push({ event: host.dataset.hsEvent || 'hubspot_form_submit', hs_form_id: formId, page_path: location.pathname });
      }
    });
  }).catch(e => { clearTimeout(timer); console.warn('[givzey] HubSpot form', e.message); fail(); });
}

export function initHubspotForms() {
  const hosts = [...document.querySelectorAll('[data-hs-form]')];
  if (!hosts.length) return;
  preconnect();
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); } }), { rootMargin: '800px 0px' })
    : null;
  hosts.forEach(h => (io ? io.observe(h) : mount(h)));
}
