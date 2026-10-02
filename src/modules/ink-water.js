// Home hero: ink falling into deep water (the Header V3 engine: heavy ink that sinks and curls, luminous
// tonemapped dye, bloom, grain), layered over the designed Figma inks, which the water pushes around.
// The whole hero drifts through the brand hues (blue → purple → orange → yellow → green → blue): the
// artwork is recoloured into the current palette and every new drop / cursor stroke is painted with it.
// The cursor paints a stroke whose colour runs through the palette along its length (GivSplash-style),
// deepens, then fades. Loader: a paper screen; the ink bleeds open from the centre into the dark hero,
// then three drops fall in.
import { REDUCED } from '../base.js';
import { composite } from './hero-ink.js';

const VERT = `precision highp float; attribute vec2 aPos; varying vec2 vUv,vL,vR,vT,vB; uniform vec2 texel;
  void main(){ vUv=aPos*.5+.5; vL=vUv-vec2(texel.x,0.); vR=vUv+vec2(texel.x,0.); vT=vUv+vec2(0.,texel.y); vB=vUv-vec2(0.,texel.y); gl_Position=vec4(aPos,0.,1.); }`;
const HEAD = `precision highp float; precision highp sampler2D; varying vec2 vUv,vL,vR,vT,vB;`;
const NOISE = `float hash(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
  float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s; }`;
const FRAG = {
  // gaussian with a lobed edge, so no drop is a perfect disc
  splat: HEAD + `uniform sampler2D uTarget; uniform float aspect,radius,wobble,seed; uniform vec4 color; uniform vec2 point;
    void main(){ vec2 p=vUv-point; p.x*=aspect; float an=atan(p.y,p.x);
      float w=1.+wobble*(.55*sin(3.*an+seed)+.3*sin(5.*an-seed*1.6)+.15*sin(7.*an+seed*2.2));
      gl_FragColor=texture2D(uTarget,vUv)+exp(-dot(p,p)/(radius*w))*color; }`,
  // one pointer segment per frame, colour blended from ca (start) to cb (end)
  seg: HEAD + `uniform sampler2D uTarget; uniform float aspect,radius; uniform vec4 ca,cb; uniform vec2 a,b;
    void main(){ vec2 pa=(vUv-a)*vec2(aspect,1.),ba=(b-a)*vec2(aspect,1.); float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-9),0.,1.);
      vec2 d=pa-ba*h; gl_FragColor=texture2D(uTarget,vUv)+exp(-dot(d,d)/radius)*mix(ca,cb,h); }`,
  // thin veils fade faster than dense ink, which keeps the water clear between plumes
  advect: HEAD + `uniform sampler2D uVel,uSrc; uniform vec2 velTexel; uniform float dt,dissipation,thinFade;
    void main(){ vec2 c=vUv-dt*texture2D(uVel,vUv).xy*velTexel; vec4 r=texture2D(uSrc,c);
      gl_FragColor=r/(1.+(dissipation+thinFade*exp(-r.a*4.))*dt); }`,
  divergence: HEAD + `uniform sampler2D uVel;
    void main(){ float L=texture2D(uVel,vL).x,R=texture2D(uVel,vR).x,T=texture2D(uVel,vT).y,B=texture2D(uVel,vB).y; vec2 C=texture2D(uVel,vUv).xy;
      if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y; gl_FragColor=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  curl: HEAD + `uniform sampler2D uVel;
    void main(){ float L=texture2D(uVel,vL).y,R=texture2D(uVel,vR).y,T=texture2D(uVel,vT).x,B=texture2D(uVel,vB).x; gl_FragColor=vec4(.5*(R-L-T+B),0.,0.,1.); }`,
  // swirl + ink heavier than water + a slow divergence-free current, so the water never sits still
  forces: HEAD + `uniform sampler2D uVel,uCurl,uDye; uniform float curl,dt,gravity,ambient,time;
    void main(){ float L=texture2D(uCurl,vL).x,R=texture2D(uCurl,vR).x,T=texture2D(uCurl,vT).x,B=texture2D(uCurl,vB).x,C=texture2D(uCurl,vUv).x;
      vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f/=length(f)+1e-4; f*=curl*C; f.y*=-1.;
      vec2 v=texture2D(uVel,vUv).xy+f*dt;
      v.y-=gravity*min(texture2D(uDye,vUv).a,1.2)*dt;
      float a1=3.*vUv.x+time*.12,b1=2.4*vUv.y-time*.1,a2=6.4*vUv.x-time*.16,b2=5.2*vUv.y+time*.11;
      vec2 cur=vec2(2.4*sin(a1)*cos(b1),-3.*cos(a1)*sin(b1))+.45*vec2(5.2*sin(a2)*cos(b2),-6.4*cos(a2)*sin(b2));
      v+=ambient*cur*dt; gl_FragColor=vec4(clamp(v,-1000.,1000.),0.,1.); }`,
  pressure: HEAD + `uniform sampler2D uP,uDiv;
    void main(){ float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x; gl_FragColor=vec4((L+R+B+T-texture2D(uDiv,vUv).x)*.25,0.,0.,1.); }`,
  gradient: HEAD + `uniform sampler2D uP,uVel;
    void main(){ float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x; gl_FragColor=vec4(texture2D(uVel,vUv).xy-vec2(R-L,T-B),0.,1.); }`,
  scale: HEAD + `uniform sampler2D uTex; uniform float value; void main(){ gl_FragColor=value*texture2D(uTex,vUv); }`,
  bright: HEAD + `uniform sampler2D uDye; uniform float exposure;
    void main(){ vec3 c=texture2D(uDye,vUv).rgb*exposure; float l=max(c.r,max(c.g,c.b)); c=l<1e-5?vec3(0.):c*(1.-exp(-l))/l; gl_FragColor=vec4(c*smoothstep(.3,.95,l),1.); }`,
  blur: HEAD + `uniform sampler2D uTex; uniform vec2 dir;
    void main(){ vec3 s=texture2D(uTex,vUv).rgb*.227; s+=(texture2D(uTex,vUv+dir*1.385).rgb+texture2D(uTex,vUv-dir*1.385).rgb)*.316; s+=(texture2D(uTex,vUv+dir*3.231).rgb+texture2D(uTex,vUv-dir*3.231).rgb)*.0703; gl_FragColor=vec4(s,1.); }`,
  display: HEAD + NOISE + `uniform sampler2D uDye,uBloom,uVel,uArt; uniform vec2 res,velTexel; uniform float bleed,maxD,aspect,time,calmAmt,bloomAmt,push,tint;
    uniform vec3 palL,palM,palD,paper; uniform vec4 calm;
    vec3 tonemap(vec3 c){ float l=max(c.r,max(c.g,c.b)); return l<1e-5?vec3(0.):c*(1.-exp(-l))/l; }
    vec3 pal(float l){ return l<.5?mix(palD,palM,l*2.):mix(palM,palL,(l-.5)*2.); }
    void main(){
      vec2 cuv=(vUv-.5)*vec2(aspect,1.); float r2=dot(cuv,cuv);
      float zone=smoothstep(1.45,.6,length((vUv-calm.xy)/calm.zw)), top=smoothstep(.86,.97,vUv.y);
      float k=(1.-calmAmt*.8*zone)*(1.-calmAmt*.55*top);
      // deep water (the hero's navy), lit from inside by the current hue
      float depth=smoothstep(-.25,1.15,vUv.y);
      vec3 col=mix(vec3(.012,.043,.173),vec3(.012,.067,.286),1.-depth);
      col+=palD*.12*(1.-smoothstep(0.,1.1,length(vec2(cuv.x*.8,cuv.y+.1))));
      // the designed inks, pushed by the water and recoloured into the palette
      // the push follows a softened copy of the velocity: the raw field is grid-sized and turns edges into steps
      vec2 v=texture2D(uVel,vUv).xy*.16;
      for(int i=0;i<6;i++){ float an=float(i)*1.0472+.35; vec2 o=vec2(cos(an),sin(an));
        v+=texture2D(uVel,vUv+o*velTexel*2.2).xy*.09+texture2D(uVel,vUv+vec2(o.y,-o.x)*velTexel*5.).xy*.05; }
      v*=velTexel; float t=time*.05;
      vec2 flow=.006*vec2(sin(vUv.y*5.+t*3.),cos(vUv.x*4.-t*2.4))+.003*vec2(sin((vUv.x+vUv.y)*11.-t*4.),cos((vUv.x-vUv.y)*9.+t*3.));
      vec4 art=texture2D(uArt,vUv-v*push+flow);
      float lum=dot(art.rgb,vec3(.299,.587,.114));
      vec3 artC=mix(art.rgb,pal(clamp(lum*1.25,0.,1.)),tint);
      col=mix(col,artC,art.a);
      // luminous ink: dense ink shades itself, thin ink leaves a haze
      vec2 off=(vUv-.5)*r2*.006; vec4 dC=texture2D(uDye,vUv);
      vec4 dye=vec4(texture2D(uDye,vUv+off).r,dC.g,texture2D(uDye,vUv-off).b,dC.a)*k;
      vec3 ink=tonemap(dye.rgb*1.5); float thin=exp(-dye.a*.2); ink*=mix(.4,1.,thin);
      float cover=1.-exp(-dye.a*1.4);
      col=mix(col,col*.55,cover*.5)+ink+palL*(1.-exp(-dye.a*.6))*.06*thin+texture2D(uBloom,vUv).rgb*bloomAmt*k;
      col*=1.-.42*smoothstep(.15,1.7,r2);
      vec2 px=vUv*res; col+=(hash(px+fract(time*.73)*1234.5)-.5)*.03;
      // loader: ink bleeding across paper
      if(bleed<1.){
        float dist=length(cuv); float nb=fbm(cuv*3.1+7.)*.62+fbm(cuv*12.+3.)*.16;
        float f=bleed*(maxD+.95)-.3-dist-(nb-.4)*.62;
        float a=max(smoothstep(0.,.02,f),smoothstep(-.11,0.,f)*.3+smoothstep(-.035,0.,f)*.25);
        vec3 pp=paper*(1.+(vnoise(px*.55)*.55+vnoise(px*.13)*.3-.43)*.05);
        col=mix(pp,col,clamp(a,0.,1.));
      }
      gl_FragColor=vec4(clamp(col,0.,1.),1.); }`
};

// light / mid / deep tones; the hero drifts blue → purple → orange → yellow → green → blue
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const PALETTES = [
  ['#ABE6FF', '#1E63E9', '#0B2A80'],   // brand blue (the artwork's own colours)
  ['#C9B8FF', '#8F7BF3', '#3A2E8F'],   // purple
  ['#FFC69A', '#F97013', '#B43A06'],   // orange
  ['#FFE6A3', '#FAB41E', '#A86400'],   // yellow
  ['#BDF2CB', '#16A34A', '#065231'],   // green
].map(p => p.map(hex));
const HOLD = 7, MOVE = 3.5, PERIOD = PALETTES.length * (HOLD + MOVE);
const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function paletteAt(t) {
  const u = ((t % PERIOD) + PERIOD) % PERIOD, slot = HOLD + MOVE, i = Math.floor(u / slot), f = u - i * slot;
  const a = PALETTES[i], b = PALETTES[(i + 1) % PALETTES.length];
  let m = f < HOLD ? 0 : (f - HOLD) / MOVE; m = m * m * (3 - 2 * m);
  // how far from the artwork's own blue (0 = untouched)
  const blueness = i === 0 ? 1 - m : i === PALETTES.length - 1 ? m : 0;
  return { L: mixc(a[0], b[0], m), M: mixc(a[1], b[1], m), D: mixc(a[2], b[2], m), tint: 1 - blueness };
}
// a colour inside the current palette: 0 deep → .5 mid → 1 light, brightened to glow in water
function inkFrom(p, s, gain = 1.15) {
  const c = s < .5 ? mixc(p.D, p.M, s * 2) : mixc(p.M, p.L, (s - .5) * 2);
  const m = Math.max(...c) || 1; return c.map(v => Math.min(1, v / m * gain * (.55 + .45 * m)));
}

export function initWaterHero(hero, { intro = false } = {}) {
  const imgs = [...hero.querySelectorAll('.home-hero_ink')];
  const wrap = hero.querySelector('.home-hero_ink-wrapper') || hero;
  const copy = hero.querySelector('.home-hero_content') || hero;
  const canvas = document.createElement('canvas'); canvas.className = 'gz-hero-ink'; canvas.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);
  const fx = document.createElement('div'); fx.className = 'gz-hero-fx'; fx.setAttribute('aria-hidden', 'true'); hero.appendChild(fx);
  const root = document.documentElement;

  const api = { ok: false, ready: Promise.resolve(), playIntro: (o = {}) => { o.onCover && o.onCover(); o.onReveal && o.onReveal(); return Promise.resolve(); } };
  const params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
  let gl = canvas.getContext('webgl2', params); const gl2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', params);
  let texType, internal, linear = true, ok = !!gl;
  if (ok) {
    if (gl2) { gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'); texType = gl.HALF_FLOAT; internal = gl.RGBA16F; }
    else { const hf = gl.getExtension('OES_texture_half_float'); if (!hf) ok = false; else { texType = hf.HALF_FLOAT_OES; internal = gl.RGBA; linear = !!gl.getExtension('OES_texture_half_float_linear'); } }
  }
  const fail = () => { canvas.remove(); fx.remove(); return api; };
  if (!ok) return fail();

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
  } catch (e) { console.warn('[givzey] water hero disabled', e); return fail(); }

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
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h, tx: 1 / w, ty: 1 / h, good, bind(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; } };
  }
  const dbl = (w, h) => { let a = fbo(w, h), b = fbo(w, h); return { get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; }, tx: 1 / w, ty: 1 / h, good: a.good && b.good }; };
  const use = name => { gl.useProgram(P[name].p); return P[name].u; };
  const blit = t => { if (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); } gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); };

  // artwork: the hero's Figma inks composited into one texture
  const art = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, art);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
  async function buildArt() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const c = await composite(hero, imgs, Math.round(hero.clientWidth * dpr), Math.round(hero.clientHeight * dpr));
    gl.bindTexture(gl.TEXTURE_2D, art); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    hero.classList.add('is-ink-live');
  }

  let vel, dye, div, curlT, prs, bloomA, bloomB, aspect = 1, VS = 1, ITER = 20, useBloom = true, quality = 1.25, forceLow = false;
  function allocate() {
    const dpr = Math.min(devicePixelRatio || 1, quality);
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    aspect = canvas.width / canvas.height;
    const size = base => aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)];
    const low = forceLow || innerWidth < 820 || matchMedia('(hover: none)').matches;
    const simBase = low ? 112 : 192; VS = simBase / 256; ITER = low ? 14 : 20; useBloom = useBloom && !low;
    const [sw, sh] = size(simBase), [dw, dh] = size(low ? 448 : 896), [bw, bh] = size(150);
    vel = dbl(sw, sh); dye = dbl(dw, dh); div = fbo(sw, sh); curlT = fbo(sw, sh); prs = dbl(sw, sh); bloomA = fbo(bw, bh); bloomB = fbo(bw, bh);
    if (!vel.good || !dye.good) ok = false;
  }

  const CFG = { curl: 16, gravity: 14, viscosity: .32, fade: .05, thin: .14, ambient: 1.1, push: .5 };
  const S = { calm: 1, bleed: intro ? 0 : 1, time: 0 };
  let pal = paletteAt(0);
  const corr = r => aspect > 1 ? r * aspect : r;
  function splatInto(target, x, y, c, radius, wobble, seed) {
    const u = use('splat'); gl.uniform2f(u.texel, target.tx, target.ty); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.point, x, y);
    gl.uniform1f(u.radius, corr(radius)); gl.uniform1f(u.wobble, wobble || 0); gl.uniform1f(u.seed, seed || 0);
    gl.uniform1i(u.uTarget, target.read.bind(0)); gl.uniform4f(u.color, c[0], c[1], c[2], c[3]); blit(target.write); target.swap();
  }
  function splat(x, y, vx, vy, color, amount, radius, wobble, seed, velScale) {
    splatInto(vel, x, y, [vx * VS, vy * VS, 0, 0], radius * (velScale || 1));
    if (color && amount > 0) splatInto(dye, x, y, [color[0] * amount, color[1] * amount, color[2] * amount, amount], radius, wobble, seed);
  }
  function segInto(target, a, b, ca, cb, radius) {
    const u = use('seg'); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.a, a[0], a[1]); gl.uniform2f(u.b, b[0], b[1]); gl.uniform1f(u.radius, corr(radius));
    gl.uniform1i(u.uTarget, target.read.bind(0)); gl.uniform4f(u.ca, ca[0], ca[1], ca[2], ca[3]); gl.uniform4f(u.cb, cb[0], cb[1], cb[2], cb[3]); blit(target.write); target.swap();
  }

  // drops: a short emitter — a tight core that keeps plunging while drag slows it, shedding dense ink on the way down
  const R0 = .0005 + .25 * .009;
  const drops = [];
  function addDrop(x, y, color, o = {}) {
    const size = o.size || 1, full = R0 * size * (.85 + Math.random() * .3), fell = o.fell !== false;
    drops.push({ x, y, color, life: 0, dur: fell ? .55 + Math.random() * .2 : .45 + Math.random() * .25,
      amount: (o.amount || (fell ? 2.4 : 1.5)) * (.85 + Math.random() * .4),
      rA: fell ? Math.min(full, .00022) : full * .3, rB: fell ? Math.max(.0006, full * .45) : full,
      py: fell ? -(.26 + Math.random() * .1) : 0, drag: 4.5,
      vx: (Math.random() - .5) * (fell ? 30 : 70), vy: fell ? -(90 + Math.random() * 50) : -(55 + Math.random() * 75),
      seed: Math.random() * 6.283, wob: .22 + Math.random() * .3 });
  }
  function runDrops(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], t0 = Math.min(d.life / d.dur, 1); if (t0 >= 1) { drops.splice(i, 1); continue; }
      d.life += dt; const t1 = Math.min(d.life / d.dur, 1);
      const dyeW = (Math.cos(Math.PI * t0) - Math.cos(Math.PI * t1)) * .5, velW = (t1 - t0) * (2 - (t0 + t1));
      d.y += d.py * dt; d.py *= Math.exp(-d.drag * dt);
      const s = t1 * t1 * (3 - 2 * t1), r = d.rA + (d.rB - d.rA) * s;
      splat(d.x, d.y, d.vx * velW, d.vy * velW, d.color, d.amount * dyeW * Math.min(6, d.rB / r), r, d.wob * s, d.seed + t1 * .6, Math.max(1.5, d.rB * 1.2 / r));
    }
  }
  // the drop is seen falling from the top of the hero before it meets the water
  function drip(x, y, color, o = {}) {
    [x, y] = safeSpot(x, y);
    if (REDUCED) { addDrop(x, y, color, o); return; }
    const W = hero.clientWidth, H = hero.clientHeight, px = x * W, py = (1 - y) * H, size = 6 + Math.min(1.6, o.size || 1) * 5, fall = (.5 + py / 760) * (o.fall || 1);
    const el = document.createElement('span'); el.className = 'gz-drip'; el.style.left = px + 'px';
    el.style.setProperty('--s', size + 'px'); el.style.setProperty('--y', (py - size).toFixed(1) + 'px'); el.style.setProperty('--d', fall.toFixed(2) + 's');
    el.style.setProperty('--c', 'rgb(' + color.map(v => Math.round(Math.min(1, v * 1.05) * 255)).join(',') + ')'); fx.appendChild(el);
    setTimeout(() => { el.remove(); addDrop(x, y, color, o); }, fall * 1000);
  }
  const avoid = () => [copy, document.querySelector('.navbar_component')].filter(Boolean);
  function clearOf(x, y) {
    const c = canvas.getBoundingClientRect(); if (!c.width) return true;
    const px = c.left + x * c.width, py = c.top + (1 - y) * c.height;
    return avoid().every(el => { const r = el.getBoundingClientRect(), m = 40; return !(px > r.left - m && px < r.right + m && py > r.top - m && py < r.bottom + m); });
  }
  function safeSpot(x, y) {
    for (let i = 0; i < 14 && !clearOf(x, y); i++) { x = i < 7 ? Math.min(.92, x + .06) : .55 + Math.random() * .38; y = .3 + Math.random() * .5; }
    return [x, y];
  }

  function step(dt) {
    let u = use('curl'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(curlT);
    u = use('forces'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uCurl, curlT.bind(1)); gl.uniform1i(u.uDye, dye.read.bind(2));
    gl.uniform1f(u.curl, CFG.curl); gl.uniform1f(u.dt, dt); gl.uniform1f(u.gravity, CFG.gravity * VS); gl.uniform1f(u.ambient, CFG.ambient * VS); gl.uniform1f(u.time, S.time); blit(vel.write); vel.swap();
    u = use('divergence'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(div);
    u = use('scale'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uTex, prs.read.bind(0)); gl.uniform1f(u.value, .8); blit(prs.write); prs.swap();
    u = use('pressure'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uDiv, div.bind(0));
    for (let i = 0; i < ITER; i++) { gl.uniform1i(u.uP, prs.read.bind(1)); blit(prs.write); prs.swap(); }
    u = use('gradient'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uP, prs.read.bind(0)); gl.uniform1i(u.uVel, vel.read.bind(1)); blit(vel.write); vel.swap();
    u = use('advect'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform2f(u.velTexel, vel.tx, vel.ty); gl.uniform1f(u.dt, dt);
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, vel.read.bind(0)); gl.uniform1f(u.dissipation, CFG.viscosity); gl.uniform1f(u.thinFade, 0); blit(vel.write); vel.swap();
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, dye.read.bind(1)); gl.uniform1f(u.dissipation, CFG.fade); gl.uniform1f(u.thinFade, CFG.thin); blit(dye.write); dye.swap();
  }
  function bloom() {
    let u = use('bright'); gl.uniform2f(u.texel, dye.tx, dye.ty); gl.uniform1i(u.uDye, dye.read.bind(0)); gl.uniform1f(u.exposure, 1.5); blit(bloomA);
    u = use('blur'); gl.uniform2f(u.texel, bloomA.tx, bloomA.ty);
    for (let i = 0; i < 2; i++) { const k = 1 + i * 1.6;
      gl.uniform1i(u.uTex, bloomA.bind(0)); gl.uniform2f(u.dir, bloomA.tx * k, 0); blit(bloomB);
      gl.uniform1i(u.uTex, bloomB.bind(0)); gl.uniform2f(u.dir, 0, bloomA.ty * k); blit(bloomA); }
  }
  let calmRect = [.3, .4, .4, .3];
  function measureCalm() {
    const r = copy.getBoundingClientRect(), c = canvas.getBoundingClientRect(); if (!c.width || !c.height) return;
    calmRect = [(r.left + r.width / 2 - c.left) / c.width, 1 - (r.top + r.height / 2 - c.top) / c.height, Math.max(.15, r.width / c.width * .62), Math.max(.15, r.height / c.height * .8)];
  }
  const PAPER = hex('#F3F5FA');
  function render() {
    if (useBloom) bloom();
    const u = use('display'); gl.uniform2f(u.texel, dye.tx, dye.ty);
    gl.uniform1i(u.uDye, dye.read.bind(0)); gl.uniform1i(u.uBloom, bloomA.bind(1)); gl.uniform1i(u.uVel, vel.read.bind(2));
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, art); gl.uniform1i(u.uArt, 3);
    gl.uniform2f(u.res, canvas.width, canvas.height); gl.uniform2f(u.velTexel, vel.tx, vel.ty); gl.uniform1f(u.push, CFG.push);
    gl.uniform1f(u.bleed, S.bleed); gl.uniform1f(u.maxD, Math.hypot(aspect * .5, .5)); gl.uniform1f(u.aspect, aspect);
    gl.uniform1f(u.time, S.time); gl.uniform1f(u.calmAmt, S.calm); gl.uniform1f(u.bloomAmt, useBloom ? .32 : 0); gl.uniform1f(u.tint, pal.tint);
    gl.uniform3fv(u.palL, pal.L); gl.uniform3fv(u.palM, pal.M); gl.uniform3fv(u.palD, pal.D); gl.uniform3fv(u.paper, PAPER);
    gl.uniform4f(u.calm, calmRect[0], calmRect[1], calmRect[2], calmRect[3]); blit(null);
  }

  // cursor: stirs the water and paints a stroke whose colour runs through the palette along its length
  const ptr = { x: 0, y: 0, ax: 0, ay: 0, has: false, moved: false, phase: Math.random(), down: false, travel: 0 };
  let lastTouch = -10;
  const toUv = e => { const c = canvas.getBoundingClientRect(); return [(e.clientX - c.left) / c.width, 1 - (e.clientY - c.top) / c.height]; };
  let revealed = !intro;
  hero.addEventListener('pointermove', e => {
    if (!revealed || REDUCED) return;
    if (e.target.closest && e.target.closest('.navbar_component')) { ptr.has = false; return; }
    const [x, y] = toUv(e); if (!ptr.has) { ptr.ax = x; ptr.ay = y; ptr.has = true; } ptr.x = x; ptr.y = y; ptr.moved = true;
  });
  hero.addEventListener('pointerleave', () => { ptr.has = false; });
  hero.addEventListener('pointerdown', e => { if (!revealed || e.target.closest('a,button,.navbar_component')) return; const [x, y] = toUv(e); Object.assign(ptr, { x, y, ax: x, ay: y, has: true, down: true, travel: 0 }); });
  addEventListener('pointerup', () => { if (ptr.down && ptr.travel < .012 && revealed) addDrop(ptr.x, ptr.y, inkFrom(pal, .55 + Math.random() * .4), { fell: false }); ptr.down = false; });
  const strokeCol = (ph, amt) => { const s = .5 - .5 * Math.cos(ph * 6.2832); const c = inkFrom(pal, .25 + .7 * s); return [c[0] * amt, c[1] * amt, c[2] * amt, amt]; };
  function runPointer() {
    if (!ptr.moved || !ptr.has) return; ptr.moved = false; lastTouch = S.time;
    const dx = ptr.x - ptr.ax, dy = ptr.y - ptr.ay, dist = Math.hypot(dx * aspect, dy); ptr.travel += dist;
    if (dist < .0004) return;
    const p0 = ptr.phase; ptr.phase += dist * 3.2;
    const amt = (ptr.down ? .22 : .07) * Math.min(1, dist * 30);
    segInto(vel, [ptr.ax, ptr.ay], [ptr.x, ptr.y], [dx * (ptr.down ? 900 : 380) * VS, dy * (ptr.down ? 900 : 380) * VS, 0, 0], [dx * (ptr.down ? 900 : 380) * VS, dy * (ptr.down ? 900 : 380) * VS, 0, 0], R0 * 1.1);
    segInto(dye, [ptr.ax, ptr.ay], [ptr.x, ptr.y], strokeCol(p0, amt), strokeCol(ptr.phase, amt), R0 * (ptr.down ? .5 : .32));
    ptr.ax = ptr.x; ptr.ay = ptr.y;
  }

  // the occasional visitor: a single drop, a pair, or a short run of drips
  let nextAuto = 1e9, lastX = .7;
  const landingX = () => { let x; do { x = .5 + Math.random() * .45; } while (Math.abs(x - lastX) < .12); lastX = x; return x; };
  function autoDrops() {
    if (S.time < nextAuto || REDUCED) return;
    if (S.time - lastTouch < 4) { nextAuto = S.time + 2 + Math.random() * 2; return; }
    const x = landingX(), y = .35 + Math.random() * .45, kind = Math.random(), c = inkFrom(pal, .5 + Math.random() * .45);
    if (kind < .5) { drip(x, y, c, { size: .7 + Math.random() * .8 }); nextAuto = S.time + 5 + Math.random() * 6; }
    else if (kind < .82) { drip(x, y, c, { size: .8 + Math.random() * .5 }); const c2 = inkFrom(pal, .3 + Math.random() * .4);
      setTimeout(() => drip(x + (Math.random() - .5) * .14, y + (Math.random() - .5) * .1, c2, { size: .5 + Math.random() * .4 }), 500 + Math.random() * 700); nextAuto = S.time + 7 + Math.random() * 6; }
    else { const n = 3 + Math.floor(Math.random() * 2), drift = (Math.random() - .5) * .2;
      for (let i = 0; i < n; i++) setTimeout(() => drip(x + drift * i / n, y - i * .025, c, { size: .35 + Math.random() * .25, amount: 1.2 }), i * 330); nextAuto = S.time + 8 + Math.random() * 6; }
  }

  // intro: paper → stepped ink bleed from the centre → copy → three opening drops
  const OPENING = [[1.05, .7, .62, 1.25], [1.9, .86, .74, .9], [2.7, .58, .3, .75]];
  let introState = null, resolveIntro = null;
  const ease = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  api.playIntro = (o = {}) => new Promise(res => {
    if (!ok) { o.onCover && o.onCover(); o.onReveal && o.onReveal(); return res(); }
    resolveIntro = res; S.bleed = 0; S.calm = 0; revealed = false;
    introState = { t: 0, fired: 0, covered: false, revealed: false, o };
    const reveal = () => { const I = introState; if (I && !I.revealed) { I.revealed = true; revealed = true; measureCalm(); I.o.onReveal && I.o.onReveal(); } };
    const cover = () => { const I = introState; if (I && !I.covered) { I.covered = true; I.o.onCover && I.o.onCover(); } };
    introState.reveal = reveal; introState.cover = cover;
    // safety nets for scarce frames (background tab, weak GPU)
    setTimeout(cover, 1200); setTimeout(reveal, 2000);
    setTimeout(() => { if (introState) { cover(); reveal(); introState = null; S.bleed = 1; S.calm = 1; nextAuto = S.time + 5; res(); } }, 4200);
  });
  function runIntro(dt) {
    const I = introState; I.t += dt; const t = I.t;
    S.bleed = Math.min(1, Math.floor(ease(t / 1.6) * 26) / 26 + (t > 1.65 ? 1 : 0));   // stepped, like sprite frames
    if (t > .55) I.cover();
    while (I.fired < OPENING.length && t >= OPENING[I.fired][0]) { const d = OPENING[I.fired++]; drip(d[1], d[2], inkFrom(pal, .6 + Math.random() * .35), { size: d[3], fall: .8 }); }
    if (t > 1.5) I.reveal();
    S.calm = Math.min(1, Math.max(0, (t - 1.5) / 1.3));
    if (t > 3.2) { introState = null; S.bleed = 1; S.calm = 1; nextAuto = S.time + 5; resolveIntro && resolveIntro(); }
  }

  let prev = performance.now(), visible = true, raf = 0, first = true; const perf = { n: 0, sum: 0 };
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || !ok) { prev = now; return; }
    const raw = now - prev, dt = Math.min(raw / 1000, 1 / 30); prev = now; S.time += dt;
    pal = paletteAt(S.time);
    if (introState) runIntro(Math.min(raw / 1000, .1));
    // GPU watchdog: bloom goes first, then resolution, then the low-res simulation
    if (raw < 1000) { perf.sum += raw; if (++perf.n === 24) { const avg = perf.sum / perf.n; perf.n = perf.sum = 0;
      if (avg > 24) {
        if (useBloom) useBloom = false;
        else if (!forceLow) { forceLow = true; quality = Math.min(quality, .85); allocate(); }
        else if (quality > .55) { quality = .55; allocate(); }
      } } }
    autoDrops(); runPointer(); runDrops(dt); step(dt); render();
    if (first) { first = false; root.classList.add('gz-paper'); }
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  let rz = 0, lastW = innerWidth;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!ok) return; measureCalm(); if (Math.abs(innerWidth - lastW) < 2) return; lastW = innerWidth; allocate(); buildArt(); }, 200); });

  if (innerWidth < 820) quality = 1;
  if (/[?&]gzlow\b/.test(location.search)) { forceLow = true; useBloom = false; quality = .5; }   // QA on software GPUs
  allocate();
  if (!ok) return fail();
  measureCalm();
  api.ok = true;
  if (/[?&]gzdebug\b/.test(location.search)) window.__gzWater = { S, drops, ptr, CFG,
    // QA: run the simulation forward synchronously (software GPUs can't hold real time)
    advance(sec, t0) { if (t0 !== undefined) S.time = t0; const n = Math.round(sec * 30); for (let i = 0; i < n; i++) { S.time += 1 / 30; pal = paletteAt(S.time); if (introState) runIntro(1 / 30); runPointer(); runDrops(1 / 30); step(1 / 30); } render(); },
    drop(x, y) { addDrop(x, y, inkFrom(pal, .7)); },
    stroke(pts) { for (const [x, y] of pts) { ptr.x = x; ptr.y = y; if (!ptr.has) { ptr.ax = x; ptr.ay = y; ptr.has = true; } ptr.moved = true; runPointer(); step(1 / 30); } render(); }, get revealed() { return revealed; }, get intro() { return introState; }, get nextAuto() { return nextAuto; } };
  api.ready = buildArt().then(() => {
    if (REDUCED) { S.bleed = 1; for (let i = 0; i < 3; i++) addDrop(.62 + i * .12, .55 + i * .08, inkFrom(pal, .7)); for (let i = 0; i < 200; i++) { runDrops(1 / 60); step(1 / 60); } render(); root.classList.add('gz-paper'); }
    else { raf = requestAnimationFrame(frame); if (!intro) nextAuto = 2; }
  }).catch(e => {
    console.warn('[givzey] water hero disabled', e);
    ok = false; api.ok = false; cancelAnimationFrame(raf); canvas.remove(); fx.remove(); hero.classList.remove('is-ink-live');
  });
  return api;
}
