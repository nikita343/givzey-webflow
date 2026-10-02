// Hero: the designed ink artwork becomes live. A fluid simulation (from the Givzey Header V2 concept)
// drives (1) a velocity field that pushes the artwork around when the cursor moves through it and
// (2) a luminous blue ink trail. The same shader runs the loader reveal: ink bleeds outward from the
// centre of the screen, uncovering the hero.
import { REDUCED } from '../base.js';

const VERT = `precision highp float; attribute vec2 aPos; varying vec2 vUv,vL,vR,vT,vB; uniform vec2 texel;
  void main(){ vUv=aPos*.5+.5; vL=vUv-vec2(texel.x,0.); vR=vUv+vec2(texel.x,0.); vT=vUv+vec2(0.,texel.y); vB=vUv-vec2(0.,texel.y); gl_Position=vec4(aPos,0.,1.); }`;
const HEAD = `precision highp float; precision highp sampler2D; varying vec2 vUv,vL,vR,vT,vB;`;
const NOISE = `float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s; }`;
const FRAG = {
  splat: HEAD + `uniform sampler2D uTarget; uniform float aspect,radius; uniform vec3 color; uniform vec2 point;
    void main(){ vec2 p=vUv-point; p.x*=aspect; gl_FragColor=vec4(texture2D(uTarget,vUv).xyz+exp(-dot(p,p)/radius)*color,1.); }`,
  advect: HEAD + `uniform sampler2D uVel,uSrc; uniform vec2 velTexel,srcTexel; uniform float dt,dissipation,fade,spread;
    void main(){ vec2 c=vUv-dt*texture2D(uVel,vUv).xy*velTexel; vec3 v=texture2D(uSrc,c).xyz;
      vec3 nb=.25*(texture2D(uSrc,c+vec2(srcTexel.x,0.)).xyz+texture2D(uSrc,c-vec2(srcTexel.x,0.)).xyz+texture2D(uSrc,c+vec2(0.,srcTexel.y)).xyz+texture2D(uSrc,c-vec2(0.,srcTexel.y)).xyz);
      v=mix(v,nb,spread); gl_FragColor=vec4(max(v/(1.+dissipation*dt)-fade*dt,0.),1.); }`,
  divergence: HEAD + `uniform sampler2D uVel;
    void main(){ float L=texture2D(uVel,vL).x,R=texture2D(uVel,vR).x,T=texture2D(uVel,vT).y,B=texture2D(uVel,vB).y; vec2 C=texture2D(uVel,vUv).xy;
      if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y; gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  curl: HEAD + `uniform sampler2D uVel;
    void main(){ float L=texture2D(uVel,vL).y,R=texture2D(uVel,vR).y,T=texture2D(uVel,vT).x,B=texture2D(uVel,vB).x; gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.); }`,
  vorticity: HEAD + `uniform sampler2D uVel,uCurl; uniform float curl,dt;
    void main(){ float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;
      vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f/=length(f)+1e-4; f*=curl*C; f.y*=-1.;
      gl_FragColor=vec4(clamp(texture2D(uVel,vUv).xy+f*dt,-1000.,1000.),0.,1.); }`,
  pressure: HEAD + `uniform sampler2D uP,uDiv;
    void main(){ float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x; gl_FragColor=vec4((L+R+B+T-texture2D(uDiv,vUv).x)*.25,0.,0.,1.); }`,
  gradient: HEAD + `uniform sampler2D uP,uVel;
    void main(){ float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x; vec2 v=texture2D(uVel,vUv).xy-vec2(R-L,T-B); gl_FragColor=vec4(v,0.,1.); }`,
  scale: HEAD + `uniform sampler2D uTex; uniform float value; void main(){ gl_FragColor=value*texture2D(uTex,vUv); }`,
  // art: the composited Figma ink, pushed by the velocity field and gently breathing
  display: HEAD + NOISE + `uniform sampler2D uDye,uVel,uArt; uniform vec2 velTexel; uniform float bleed,maxD,aspect,time,calmAmt,push;
    uniform vec3 bgTop,bgBot,bleedBase; uniform vec4 calm;
    void main(){
      vec2 v=texture2D(uVel,vUv).xy*velTexel;
      float t=time*.05;
      vec2 flow=.006*vec2(sin(vUv.y*5.+t*3.),cos(vUv.x*4.-t*2.4))+.003*vec2(sin((vUv.x+vUv.y)*11.-t*4.),cos((vUv.x-vUv.y)*9.+t*3.));
      vec2 uv=vUv-v*push+flow;
      vec4 art=texture2D(uArt,uv);
      vec3 bg=mix(bgBot,bgTop,smoothstep(.0,.7035,vUv.y));
      vec3 col=mix(bg,art.rgb,art.a);
      vec3 d=texture2D(uDye,vUv).xyz; float a=d.x+d.y;
      float zone=smoothstep(1.25,.35,length((vUv-calm.xy)/calm.zw));
      float k=1.-calmAmt*.7*zone;
      float cover=(1.-exp(-a*3.2))*k, deep=smoothstep(.3,.72,d.x/(a+1e-4));
      vec3 ink=mix(vec3(.07,.32,.87),vec3(.35,.65,.98),smoothstep(.05,.7,a));
      ink=mix(ink,vec3(.67,.9,1.),smoothstep(.55,1.1,a)*(1.-deep*.6));
      col=mix(col,ink,cover*.9);
      if(bleed<1.){
        vec2 q=(vUv-.5)*vec2(aspect,1.); float dist=length(q);
        float nb=fbm(q*3.1+7.)*.62+fbm(q*12.+3.)*.16;
        float f=bleed*(maxD+.95)-.3-dist-(nb-.4)*.62;
        float inkAmt=max(smoothstep(0.,.02,f),smoothstep(-.11,0.,f)*.3+smoothstep(-.035,0.,f)*.25);
        col=mix(bleedBase,col,clamp(inkAmt,0.,1.));
      }
      gl_FragColor=vec4(col,1.); }`
};

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);

// draw the hero's <img> inks (absolutely positioned + rotated in Webflow) into one canvas
// the page's <img>s are not CORS-enabled, so WebGL needs fresh anonymous-CORS copies (Webflow's CDN allows it)
const corsCopy = img => new Promise(res => {
  const c = new Image(); c.crossOrigin = 'anonymous'; c.decoding = 'async';
  c.onload = () => res(c); c.onerror = () => res(null);
  c.src = img.currentSrc || img.src;
});
async function composite(hero, imgs, w, h) {
  await Promise.all(imgs.map(i => (i.complete && i.naturalWidth) ? null : new Promise(r => { i.onload = i.onerror = r; })));
  const copies = await Promise.all(imgs.map(corsCopy));
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const hr = hero.getBoundingClientRect(), sx = w / hr.width, sy = h / hr.height;
  g.scale(sx, sy);
  for (const [k, img] of imgs.entries()) {
    const src = copies[k]; const cs = getComputedStyle(img); if (!src || !img.naturalWidth) continue;
    const m = new DOMMatrix(cs.transform === 'none' ? undefined : cs.transform);
    const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
    // layout box relative to the hero (offset chain up to the hero)
    let x = 0, y = 0, el = img; while (el && el !== hero) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    g.save(); g.globalAlpha = parseFloat(cs.opacity) || 1;
    g.translate(x + ox, y + oy); g.transform(m.a, m.b, m.c, m.d, m.e, m.f); g.translate(-ox, -oy);
    g.drawImage(src, 0, 0, img.offsetWidth, img.offsetHeight); g.restore();
  }
  return c;
}

export function initHeroInk(hero, { intro = false } = {}) {
  const imgs = [...hero.querySelectorAll('.home-hero_ink')];
  const wrap = hero.querySelector('.home-hero_ink-wrapper') || hero;
  const copy = hero.querySelector('.home-hero_content') || hero;
  const canvas = document.createElement('canvas'); canvas.className = 'gz-hero-ink'; canvas.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);

  const params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  let gl = canvas.getContext('webgl2', params); const gl2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', params);
  let texType, internal, linear = true, ok = !!gl;
  if (ok) {
    if (gl2) { gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'); texType = gl.HALF_FLOAT; internal = gl.RGBA16F; }
    else { const hf = gl.getExtension('OES_texture_half_float'); if (!hf) ok = false; else { texType = hf.HALF_FLOAT_OES; internal = gl.RGBA; linear = !!gl.getExtension('OES_texture_half_float_linear'); } }
  }
  const api = { ok: false, playIntro: () => Promise.resolve() };
  if (!ok) { canvas.remove(); return api; }

  const compile = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const P = {};
  try {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    for (const name in FRAG) {
      const p = gl.createProgram(); gl.attachShader(p, vs); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAG[name])); gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
      const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
      P[name] = { p, u };
    }
  } catch (e) { console.warn('[givzey] hero ink disabled', e); canvas.remove(); return api; }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.disable(gl.BLEND);

  function fbo(w, h) {
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
    const f = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, texType, null);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    const good = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, tx: 1 / w, ty: 1 / h, good, bind(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; } };
  }
  const dbl = (w, h) => { let a = fbo(w, h), b = fbo(w, h); return { get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; }, tx: 1 / w, ty: 1 / h, good: a.good && b.good }; };
  const use = name => { gl.useProgram(P[name].p); return P[name].u; };
  const blit = t => { if (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); } gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); };

  // artwork texture
  const art = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, art);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  let artReady = false;
  async function buildArt() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const c = await composite(hero, imgs, Math.round(hero.clientWidth * dpr), Math.round(hero.clientHeight * dpr));
    gl.bindTexture(gl.TEXTURE_2D, art);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    artReady = true; hero.classList.add('is-ink-live');
  }

  let vel, dye, div, curlT, prs, aspect = 1;
  function allocate() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    aspect = canvas.width / canvas.height;
    const size = base => aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)];
    const small = innerWidth < 820, [sw, sh] = size(small ? 80 : 110), [dw, dh] = size(small ? 384 : 640);
    vel = dbl(sw, sh); dye = dbl(dw, dh); div = fbo(sw, sh); curlT = fbo(sw, sh); prs = dbl(sw, sh);
    if (!vel.good || !dye.good) ok = false;
  }

  const S = { velDiss: .35, dyeDiss: .9, dyeFade: .07, dyeSpread: .14, curl: 4, calm: 1, bleed: 1, push: 1.4 };
  const FEEL = { simSpeed: .55, trailForce: 820, trailPush: 1, trailInk: .3, trailRadius: .7, swirlEvery: .11, swirlOffset: .055, swirlSize: .085, swirlSpeed: 220 };
  const INKS = [[1, .12], [.15, 1], [.85, .35], [.3, .9]];
  const glow = (i, s) => { const c = INKS[i % INKS.length]; return [c[0] * s, c[1] * s, 0]; };
  function splat(x, y, vx, vy, color, radius, dyeRadius = radius) {
    const u = use('splat'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.point, x, y);
    gl.uniform1f(u.radius, radius * (aspect > 1 ? aspect : 1) / 100);
    gl.uniform1i(u.uTarget, vel.read.bind(0)); gl.uniform3f(u.color, vx, vy, 0); blit(vel.write); vel.swap();
    if (color) { gl.uniform1f(u.radius, dyeRadius * (aspect > 1 ? aspect : 1) / 100); gl.uniform1i(u.uTarget, dye.read.bind(0)); gl.uniform3f(u.color, color[0], color[1], color[2]); blit(dye.write); dye.swap(); }
  }
  let inkIndex = 0;
  function drop(x, y, big, inkScale = 1) {
    const i = inkIndex++, dir = Math.random() * 6.283, sp = 110 + Math.random() * 190;
    splat(x, y, Math.cos(dir) * sp, Math.sin(dir) * sp, glow(i, (big ? 1.2 : .9) * inkScale), big ? 1.4 : .95);
    const n = big ? 8 : 6, r = big ? .1 : .075;
    for (let k = 0; k < n; k++) { const a = k / n * 6.283 + Math.random(); splat(x + Math.cos(a) * r / aspect, y + Math.sin(a) * r, Math.cos(a) * 280, Math.sin(a) * 280, glow(i + 1 + (k & 1), .26 * inkScale), .32); }
  }
  function step(dt) {
    let u = use('curl'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(curlT);
    u = use('vorticity'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uCurl, curlT.bind(1)); gl.uniform1f(u.curl, S.curl); gl.uniform1f(u.dt, dt); blit(vel.write); vel.swap();
    u = use('divergence'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(div);
    u = use('scale'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uTex, prs.read.bind(0)); gl.uniform1f(u.value, .8); blit(prs.write); prs.swap();
    u = use('pressure'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uDiv, div.bind(0));
    for (let i = 0; i < 16; i++) { gl.uniform1i(u.uP, prs.read.bind(1)); blit(prs.write); prs.swap(); }
    u = use('gradient'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uP, prs.read.bind(0)); gl.uniform1i(u.uVel, vel.read.bind(1)); blit(vel.write); vel.swap();
    u = use('advect'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform2f(u.velTexel, vel.tx, vel.ty); gl.uniform1f(u.dt, dt);
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, vel.read.bind(0)); gl.uniform1f(u.dissipation, S.velDiss); gl.uniform1f(u.fade, 0); gl.uniform1f(u.spread, 0); blit(vel.write); vel.swap();
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, dye.read.bind(1)); gl.uniform1f(u.dissipation, S.dyeDiss); gl.uniform1f(u.fade, S.dyeFade); gl.uniform1f(u.spread, S.dyeSpread); gl.uniform2f(u.srcTexel, dye.tx * 2, dye.ty * 2); blit(dye.write); dye.swap();
  }
  let calmRect = [.5, .5, .35, .3];
  function measureCalm() {
    const r = copy.getBoundingClientRect(), c = canvas.getBoundingClientRect(); if (!c.width || !c.height) return;
    calmRect = [(r.left + r.width / 2 - c.left) / c.width, 1 - (r.top + r.height / 2 - c.top) / c.height, Math.max(.15, r.width / c.width * .45), Math.max(.15, r.height / c.height * .5)];
  }
  const TOP = hex('#030B2C'), BOT = hex('#031149'), BLEED = hex('#01061a');
  function render(now) {
    const u = use('display'); gl.uniform2f(u.texel, dye.tx, dye.ty);
    gl.uniform1i(u.uDye, dye.read.bind(0)); gl.uniform1i(u.uVel, vel.read.bind(1));
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, art); gl.uniform1i(u.uArt, 2);
    gl.uniform2f(u.velTexel, vel.tx, vel.ty); gl.uniform1f(u.push, S.push);
    gl.uniform1f(u.bleed, S.bleed); gl.uniform1f(u.maxD, Math.hypot(aspect * .5, .5)); gl.uniform1f(u.aspect, aspect); gl.uniform1f(u.time, now / 1000); gl.uniform1f(u.calmAmt, S.calm);
    gl.uniform3f(u.bgTop, TOP[0], TOP[1], TOP[2]); gl.uniform3f(u.bgBot, BOT[0], BOT[1], BOT[2]); gl.uniform3f(u.bleedBase, BLEED[0], BLEED[1], BLEED[2]);
    gl.uniform4f(u.calm, calmRect[0], calmRect[1], calmRect[2], calmRect[3]); blit(null);
  }

  // pointer: ink laid along the whole path since last frame
  let ptr = null, prevPtr = null, travelled = 0, swirlN = 0, revealed = !intro;
  const onMove = e => {
    if (e.target.closest && e.target.closest('.navbar_component')) { ptr = prevPtr = null; return; }
    const c = canvas.getBoundingClientRect(); ptr = [(e.clientX - c.left) / c.width, 1 - (e.clientY - c.top) / c.height];
  };
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', () => { ptr = prevPtr = null; travelled = 0; });
  function swirl(cx, cy, spin) {
    const R = FEEL.swirlSize;
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; splat(cx + Math.cos(a) * R / aspect, cy + Math.sin(a) * R, -Math.sin(a) * spin * FEEL.swirlSpeed, Math.cos(a) * spin * FEEL.swirlSpeed, null, .12); }
  }
  function trail() {
    if (!ptr || REDUCED || !revealed) { prevPtr = ptr && ptr.slice(); return; }
    if (!prevPtr) { prevPtr = ptr.slice(); return; }
    const dx = ptr[0] - prevPtr[0], dy = ptr[1] - prevPtr[1], sp = Math.hypot(dx * aspect, dy);
    if (sp < 0.0005) return;
    const n = Math.min(32, Math.ceil(sp / .008)), k = Math.min(1, sp * 40), ink = glow(Math.floor(performance.now() / 260), FEEL.trailInk * k / n);
    for (let j = 1; j <= n; j++) { const t = j / n; splat(prevPtr[0] + dx * t, prevPtr[1] + dy * t, dx * FEEL.trailForce * aspect / n, dy * FEEL.trailForce / n, ink, FEEL.trailPush, FEEL.trailRadius); }
    travelled += sp;
    if (travelled > FEEL.swirlEvery) {
      travelled = 0; const side = swirlN++ % 2 ? 1 : -1, nx = -dy / sp, ny = dx * aspect / sp;
      swirl(ptr[0] + nx * side * FEEL.swirlOffset / aspect, ptr[1] + ny * side * FEEL.swirlOffset, side);
    }
    prevPtr = ptr.slice();
  }

  // slow ambient life: a soft drop every few seconds in the outer thirds (never over the copy)
  let nextAmbient = 4;
  function ambient(t) {
    if (REDUCED || t < nextAmbient) return;
    nextAmbient = t + 5 + Math.random() * 4;
    const left = Math.random() < .5, x = left ? .06 + Math.random() * .2 : .74 + Math.random() * .2, y = .15 + Math.random() * .7;
    drop(x, y, false, .55);
  }

  // intro: [time, x, y, big]
  const BURST = [[.25, .74, .5, 1], [.6, .22, .7, 0], [1.0, .88, .78, 0], [1.4, .16, .3, 0]];
  let introState = null, resolveIntro = null;
  const ease = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  api.playIntro = (onReveal) => new Promise(res => {
    if (!ok) { onReveal && onReveal(); return res(); }
    resolveIntro = res; S.bleed = 0; S.calm = 0; revealed = false;
    introState = { t: 0, fired: 0, revealed: false, onReveal };
  });
  function runIntro(dt) {
    const I = introState; I.t += dt; const t = I.t;
    S.bleed = Math.min(1, Math.floor(ease(t / 1.6) * 28) / 28 + (t > 1.65 ? 1 : 0));   // stepped, like sprite frames
    while (I.fired < BURST.length && t >= BURST[I.fired][0]) { const b = BURST[I.fired++]; drop(b[1], b[2], b[3], .8); }
    if (t > .7 && !I.revealed) { I.revealed = true; revealed = true; I.onReveal && I.onReveal(); }
    S.calm = Math.min(1, Math.max(0, (t - .9) / 1.2));
    if (t > 2.2) { introState = null; S.bleed = 1; S.calm = 1; resolveIntro && resolveIntro(); }
  }

  let prev = performance.now(), visible = true, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || !ok) { prev = now; return; }
    const dt = Math.min((now - prev) / 1000, 1 / 30); prev = now;
    if (introState) runIntro(dt);
    ambient(now / 1000); trail();
    step(dt * FEEL.simSpeed); render(now);
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);

  let rz = 0, lastW = innerWidth;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!ok) return; measureCalm(); if (Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; allocate(); buildArt(); }, 200); });

  allocate();
  if (!ok) { canvas.remove(); return api; }
  measureCalm();
  api.ok = true;
  api.ready = buildArt().then(() => { if (REDUCED) { render(0); } else raf = requestAnimationFrame(frame); })
    .catch(e => {   // never take the page down with it: fall back to the static <img> inks
      console.warn('[givzey] hero ink disabled', e);
      ok = false; api.ok = false; cancelAnimationFrame(raf); canvas.remove(); hero.classList.remove('is-ink-live');
    });
  if (REDUCED) render(0);
  return api;
}
