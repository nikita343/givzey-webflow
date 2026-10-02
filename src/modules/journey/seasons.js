export const SEASONS = [
  { name: 'Winter', ink: 'winter', k: 1.00, fig: [9, 27, 92], top: [36, 74, 170], bg: [233, 239, 250], glow: [140, 186, 255], acc: [30, 99, 233] },
  { name: 'Spring', ink: 'spring', k: 1.00, fig: [16, 58, 33], top: [46, 112, 68], bg: [235, 243, 231], glow: [168, 232, 150], acc: [46, 158, 94] },
  { name: 'Summer', ink: 'summer', k: 1.79, fig: [86, 42, 6], top: [160, 86, 22], bg: [250, 241, 227], glow: [255, 202, 120], acc: [224, 122, 18] },
  { name: 'Fall', ink: 'fall', k: 1.79, fig: [60, 28, 15], top: [128, 64, 34], bg: [244, 235, 227], glow: [255, 168, 120], acc: [184, 86, 10] }
];
export const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
export const rgb = c => `rgb(${c[0]},${c[1]},${c[2]})`;
export const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
export function seasonAt(v) {
  const n = SEASONS.length; const i = ((Math.floor(v) % n) + n) % n, j = (i + 1) % n, t = v - Math.floor(v);
  const A = SEASONS[i], B = SEASONS[j]; const o = {};
  for (const k of ['fig', 'top', 'bg', 'glow', 'acc']) o[k] = mix(A[k], B[k], t);
  o.name = t < .5 ? A.name : B.name; return o;
}
export function weights(v) { return [0, 1, 2, 3].map(i => { let d = Math.abs(v - i) % 4; d = Math.min(d, 4 - d); return clamp(1 - d); }); }
