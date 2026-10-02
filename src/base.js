// Files deployed with the bundle live at the root of the Vercel deployment
export const BASE = new URL('/', import.meta.url);
export const ASSET = p => new URL(p, BASE).href;
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = matchMedia('(hover: none)').matches;
