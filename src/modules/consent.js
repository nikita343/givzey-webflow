// Cookie consent (launch tracker: "consent banner"; mirrors the Wix banner on givzey.com: Analytics + Advertising,
// opt-in). Google Consent Mode v2: the defaults (everything denied except essential) are set by the inline
// "Consent defaults" site script that runs in <head> BEFORE Google Tag Manager, and it re-applies a stored choice
// on every page. This module only shows the banner, stores the choice and sends the consent update.
//   storage: localStorage "gz-consent" = { v: 1, a: analytics, m: advertising, t: timestamp }
//   dataLayer event on every choice: { event: 'gz_consent', gz_analytics, gz_marketing } (GTM trigger for non-Google tags)
//   window.gzConsent.open() reopens the settings (footer "Cookie settings").
import '../consent.css';

const KEY = 'gz-consent', VERSION = 1;

const read = () => { try { const c = JSON.parse(localStorage.getItem(KEY)); return c && c.v === VERSION ? c : null; } catch (e) { return null; } };
function apply(a, m) {
  const g = 'granted', d = 'denied';
  window.dataLayer = window.dataLayer || [];
  const gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  gtag('consent', 'update', { analytics_storage: a ? g : d, ad_storage: m ? g : d, ad_user_data: m ? g : d, ad_personalization: m ? g : d });
  window.dataLayer.push({ event: 'gz_consent', gz_analytics: !!a, gz_marketing: !!m });
}
function save(a, m) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: VERSION, a: !!a, m: !!m, t: Date.now() })); } catch (e) {}
  apply(a, m);
}

const TOGGLES = [
  ['a', 'Analytics', 'Helps us understand which pages people visit and how they find us. Google Analytics.'],
  ['m', 'Advertising', 'Lets us measure our campaigns and show relevant ads on other sites. LinkedIn and Google Ads.']
];

function build() {
  const box = document.createElement('div');
  box.className = 'gz-consent';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'false');
  box.setAttribute('aria-labelledby', 'gz-consent-title');
  box.innerHTML = `
    <div class="gz-consent_main">
      <p class="gz-consent_title" id="gz-consent-title">We use cookies</p>
      <p class="gz-consent_text">We use essential cookies to run this site. With your permission we also use analytics and advertising cookies to understand how the site is used and to measure our marketing. <a href="/privacy" class="gz-consent_link">Privacy policy</a></p>
      <div class="gz-consent_prefs" hidden>
        <div class="gz-consent_row is-locked"><div><span class="gz-consent_name">Essential</span><span class="gz-consent_desc">Needed for the site and forms to work.</span></div><span class="gz-consent_always">Always on</span></div>
        ${TOGGLES.map(([k, name, desc]) => `
        <label class="gz-consent_row"><div><span class="gz-consent_name">${name}</span><span class="gz-consent_desc">${desc}</span></div>
          <input type="checkbox" class="gz-consent_switch" data-k="${k}"><span class="gz-consent_track" aria-hidden="true"></span></label>`).join('')}
      </div>
      <div class="gz-consent_actions">
        <button type="button" class="gz-consent_btn is-primary" data-act="all">Accept all</button>
        <button type="button" class="gz-consent_btn" data-act="none">Reject all</button>
        <button type="button" class="gz-consent_btn is-text" data-act="prefs">Settings</button>
        <button type="button" class="gz-consent_btn is-primary" data-act="save" hidden>Save choices</button>
      </div>
    </div>`;
  return box;
}

let box = null;
function show(withPrefs) {
  if (!box) {
    box = build();
    document.body.appendChild(box);
    box.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act; if (!act) return;
      if (act === 'all') { save(true, true); hide(); }
      else if (act === 'none') { save(false, false); hide(); }
      else if (act === 'prefs') prefs(true);
      else if (act === 'save') {
        const v = k => box.querySelector(`.gz-consent_switch[data-k="${k}"]`).checked;
        save(v('a'), v('m')); hide();
      }
    });
    box.addEventListener('keydown', e => { if (e.key === 'Escape' && read()) hide(); });
  }
  const c = read();
  box.querySelectorAll('.gz-consent_switch').forEach(s => { s.checked = c ? !!c[s.dataset.k] : false; });
  prefs(!!withPrefs);
  box.hidden = false;
  requestAnimationFrame(() => box.classList.add('is-in'));
}
function prefs(on) {
  box.classList.toggle('is-prefs', on);
  box.querySelector('.gz-consent_prefs').hidden = !on;
  box.querySelector('[data-act="prefs"]').hidden = on;
  box.querySelector('[data-act="save"]').hidden = !on;
  if (on) box.querySelector('.gz-consent_switch')?.focus({ preventScroll: true });
}
function hide() { if (!box) return; box.classList.remove('is-in'); setTimeout(() => { if (box && !box.classList.contains('is-in')) box.hidden = true; }, 350); }

function footerLink() {
  const list = document.querySelector('.footer_component .footer_legal');
  if (!list || list.querySelector('.gz-consent_open')) return;
  const li = document.createElement('li');
  li.innerHTML = '<button type="button" class="footer_legal-link gz-consent_open">Cookie settings</button>';
  li.firstChild.addEventListener('click', () => show(true));
  list.appendChild(li);
}

export function initConsent() {
  window.gzConsent = { open: () => show(true), get: read };
  footerLink();
  if (!read()) setTimeout(() => show(false), 1200);   // after the homepage intro has started, never on top of it at once
}
