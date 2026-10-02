// Files deployed next to givzey.js (Vercel)
export const BASE = new URL('./', import.meta.url);   // base.js is bundled into givzey.js
export const ASSET = p => new URL(p, BASE).href;
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = matchMedia('(hover: none)').matches;
