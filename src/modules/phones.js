// Client tracker 26 Oct: "add all of the conversations in faux Apple devices so it looks more real. Could cut off
// the bottom of the device in the sections if needed."
// The conversation mocks stay plain Webflow elements (copy editable in the Designer). At load each one is moved
// into an iPhone frame (status bar, Dynamic Island, Messages or Mail chrome); the section crops the bottom of the
// device. Outcome cards that are not part of the donor's phone (CRM status, "Richard replied" on an email) float
// beside the device instead of sitting inside it.
import '../phones.css';

const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html) n.innerHTML = html; return n; };

const ICONS = `<svg class="gz-phone_icons" viewBox="0 0 68 12" fill="currentColor" aria-hidden="true">
  <rect x="0" y="7.6" width="3" height="3.9" rx=".8"/><rect x="4.5" y="5.6" width="3" height="5.9" rx=".8"/>
  <rect x="9" y="3.4" width="3" height="8.1" rx=".8"/><rect x="13.5" y="1" width="3" height="10.5" rx=".8"/>
  <path d="M28 11.4l-2.3-2.7a3.5 3.5 0 0 1 4.6 0z"/>
  <path d="M23.4 6.6a7 7 0 0 1 9.2 0M20.7 3.8a11 11 0 0 1 14.6 0" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
  <rect x="41.5" y="1" width="22" height="10.5" rx="3.2" fill="none" stroke="currentColor" stroke-opacity=".38"/>
  <rect x="43.5" y="3" width="18" height="6.5" rx="1.6"/><path d="M65.3 4.4v3.7a2 2 0 0 0 0-3.7z" fill-opacity=".4"/></svg>`;
const BAR = `<div class="gz-phone_bar" aria-hidden="true"><span class="gz-phone_time">9:41</span><i class="gz-phone_island"></i>${ICONS}</div>`;
const CHEVRON = '<svg viewBox="0 0 12 20" aria-hidden="true"><path d="M10 2L2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const VIDEO = '<svg viewBox="0 0 26 16" aria-hidden="true"><rect x="1" y="1" width="16" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M18.5 6.2l5.6-3.4v10.4l-5.6-3.4z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"/></svg>';
const STAMP = '<b>Text Message</b>Today 9:38 AM';
const UPDOWN = '<svg viewBox="0 0 40 14" aria-hidden="true"><path d="M2 10l6-6 6 6M26 4l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// wraps `target` in a device and returns its screen
function frame(target, kind) {
  const phone = el('div', `gz-phone is-${kind}`);
  const screen = el('div', 'gz-phone_screen', BAR);
  target.parentNode.insertBefore(phone, target);
  phone.appendChild(screen);
  if (kind === 'mail') screen.appendChild(el('div', 'gz-phone_mailnav', `<span class="gz-phone_back">${CHEVRON}Inbox</span>${UPDOWN}`));
  screen.appendChild(target);
  target.classList.add('gz-phone_app');
  return { phone, screen };
}

// Messages: back chevron and FaceTime button either side of the contact
function messagesChrome(header) {
  if (!header || header.querySelector('.gz-phone_back')) return;
  header.prepend(el('span', 'gz-phone_back', CHEVRON));
  header.append(el('span', 'gz-phone_cam', VIDEO));
}

function home() {
  document.querySelectorAll('.home-product_visual').forEach(visual => {
    const card = visual.querySelector(':scope > .mock-card'); if (!card) return;
    const mail = !!card.querySelector('.mock-email_header');
    frame(card, mail ? 'mail' : 'sms');
    visual.classList.add('has-phone');
    if (mail) {
      // the donor's reply reads as an outcome next to the device, not as part of the email
      const reply = card.querySelector('.mock-email_reply');
      if (reply) { reply.classList.add('gz-phone_callout'); visual.appendChild(reply); }
    } else {
      const header = card.querySelector('.mock-card_header');
      // a contact photo of a silhouette reads odd in Messages: show the grey iOS monogram instead (client 26 Oct)
      const persona = header?.querySelector(':scope > .mock-persona');
      if (persona) {
        const name = header.querySelector('.mock-name')?.textContent.trim() || '';
        persona.before(el('div', 'mock-avatar gz-phone_monogram', name.charAt(0).toUpperCase()));
        persona.classList.add('is-replaced');
      }
      messagesChrome(header);
    }
  });
}

function productHero() {
  document.querySelectorAll('.product-chat_stack').forEach(stack => {
    const card = stack.querySelector(':scope > .product-chat_card'); if (!card) return;
    const reply = stack.querySelector(':scope > .product-chat_reply');
    const sms = /text message/i.test(card.querySelector('.product-chat_from-meta')?.textContent || '');
    const { screen } = frame(card, sms ? 'sms' : 'mail');
    stack.classList.add('has-phone');
    if (sms && reply) { screen.appendChild(reply); reply.classList.add('is-in-phone'); }
    else if (reply) reply.classList.add('gz-phone_callout');
    stack.querySelector(':scope > .product-chat_status')?.classList.add('gz-phone_callout');
    if (sms) {
      const from = card.querySelector('.product-chat_from');
      if (from) { messagesChrome(from); from.after(el('div', 'gz-phone_stamp', STAMP)); }
    }
  });
}

function solutions() {
  document.querySelectorAll('.sol-preview > .sol-chat').forEach(chat => {
    frame(chat, 'sms');
    chat.closest('.sol-preview').classList.add('has-phone');
    const head = chat.querySelector('.sol-chat_head');
    if (head) { messagesChrome(head); head.after(el('div', 'gz-phone_stamp', STAMP)); }
  });
}

// VEO hero (client 26 Oct): the three touchpoint cards are notifications on the donor's lock screen.
// The cards stay Webflow elements; the newest (gift, first in the DOM) sits on top as on iOS.
function lockScreen() {
  document.querySelectorAll('.product-hero_visual.is-veo .product-hero_stack').forEach(stack => {
    if (stack.closest('.gz-phone')) return;
    const { screen } = frame(stack, 'lock');
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    stack.before(el('div', 'gz-phone_lockhead', `<span class="gz-phone_date">${date}</span><span class="gz-phone_clock">9:41</span>`));
    screen.appendChild(el('div', 'gz-phone_home', ''));
    stack.closest('.product-hero_visual').classList.add('has-lock');
  });
}

export function initPhones() {
  for (const fn of [home, productHero, solutions, lockScreen]) { try { fn(); } catch (e) { console.error('[givzey] phones', e); } }
}
