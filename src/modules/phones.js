// iPhone frames around the conversation mocks (client tracker 26 Oct).
// Since 29 Oct the frames are real Webflow elements (gz-phone > gz-phone_screen > gz-phone_bar + the mock) styled by
// public/device.css, which the "Device styles" component links on each page, so the Designer shows the same phones
// as the live site and the copy is edited in place. Nothing is built here any more; this only keeps the lock-screen
// date current on the VEO hero.
export function initPhones() {
  try {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    document.querySelectorAll('.gz-phone.is-lock .gz-phone_date').forEach(n => { n.textContent = date; });
  } catch (e) { console.error('[givzey] phones', e); }
}
