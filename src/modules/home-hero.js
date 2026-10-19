// Home hero (Loom feedback 15 Oct): a full ink field on the hero's dark blue, GivSplash "Fluid" feel.
//   - The cursor drags a large soft trail of medium-blue ink through the water; it swirls, drifts away and fades.
//   - When nobody is moving the cursor, a slow invisible hand paints the odd calm stroke at the edges, so it is never dead.
//   - The whole scene (navy base + ink) shifts hue together: blue -> purple -> warm red/orange -> back (HUE below).
//   - Subtle ink drops keep falling into the water from the top of the hero (client tracker 19 Oct), on top of the
//     cursor interaction: a small droplet is seen falling, lands with a faint ring and sinks as a soft plume.
//   - A calm zone sits behind the headline, subhead and button: ink is held back there and a soft scrim darkens it.
//   - Loader hand-off: burst(svg) stamps the loader's logo into the ink, blows it outward and bleeds the hero open
//     from the centre (the Header V2 bleed), then the copy comes in.
// No artwork: the designed Figma inks stay in the page only as the no-WebGL fallback.
import { REDUCED } from '../base.js';
import { revealMode } from './loader.js';

// ---- tunables (Nick: everything worth tweaking lives here) ----
export const HERO_FX = {
  // simulation
  simRes: 128, simResLow: 80,          // velocity grid (short side)
  dyeRes: 760, dyeResLow: 420,         // ink texture (short side)
  iter: 20, iterLow: 12,               // pressure iterations
  dprMax: 1.5,
  simSpeed: .85,                       // < 1 = slower, calmer water
  velDiss: .34,                        // how quickly motion dies (higher = stops sooner)
  dyeDiss: .78,                        // how quickly ink fades (higher = shorter-lived ink)
  dyeFade: .014,                       // subtractive clean-up so faint haze disappears
  whiteDiss: 3.4,                      // how fast the white logo ink turns into blue ink after the burst
  spread: .06,                         // ink softening per step (0 = crisp, .15 = cloudy)
  curl: 9,                             // swirl strength (vorticity confinement)
  // cursor trail
  trailRadius: .0062,                  // ink radius (bigger = wider, softer trail)
  trailVelRadius: .011,                // radius of the push
  trailInk: .3,                        // ink density along the trail
  trailPush: .7,                       // how much the water follows the cursor
  trailSmooth: 22,                     // cursor follow rate (lower = lazier, rounder strokes)
  swirlEvery: .13, swirlOffset: .05, swirlSize: .0035, swirlSpeed: 260,   // little vortices shed beside the path
  // ambient hand (idle only)
  ambientIdle: 3.5,                    // seconds without cursor before it starts
  ambientInk: .18, ambientSpeed: .16, ambientPush: .5,
  // falling drops (always on, cursor or not)
  dripFirst: 1.6,                      // seconds after the reveal before the first drop
  dripEvery: [4.5, 9],                 // seconds between drops (random in range); sometimes a second one follows
  dripInk: .34,                        // ink each drop brings (subtle; the cursor trail is .3 per stroke)
  dripSize: .62,                       // plume size
  dripSink: 26,                        // downward push of the plume (uv/s x sim) - the "dropping down" feel
  // loader burst
  burst: 800,                          // total outward push that blows the logo apart (spread over three pulses)
  // copy protection
  calm: .88,                           // ink held back behind the copy (0..1)
  scrim: .34,                          // extra darkening behind the copy (0..1)
  // colour (blue palette; the hue cycle rotates all of it)
  base: ['#030B2C', '#031149'],        // hero top / bottom (the Webflow gradient)
  glow: '#0B2C93',                     // soft inner light of the water
  loader: '#020924',                   // loader screen for the 'burst' reveal (a touch darker than the hero, so the bleed reads)
  paper: '#F3F5FA',                    // loader screen for the 'ink' reveal (Header V1: ink bleeding across paper)
  inkDeep: '#1D4CD2', inkSky: '#4A8BF5', inkLight: '#A8CBFF',
  hueMax: 150,                         // degrees at the warm end (0 = blue, 50 purple, 100 magenta, 150 red-orange)
  huePeriod: 44                        // seconds for blue -> warm -> blue
};

const VERT = `precision highp float; attribute vec2 aPos; varying vec2 vUv,vL,vR,vT,vB; uniform vec2 texel;
  void main(){ vUv=aPos*.5+.5; vL=vUv-vec2(texel.x,0.); vR=vUv+vec2(texel.x,0.); vT=vUv+vec2(0.,texel.y); vB=vUv-vec2(0.,texel.y); gl_Position=vec4(aPos,0.,1.); }`;
const HEAD = `precision highp float; precision highp sampler2D; varying vec2 vUv,vL,vR,vT,vB;`;
const NOISE = `float hash(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
  float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
  float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+17.1; a*=.5; } return s; }`;
const FRAG = {
  splat: HEAD + `uniform sampler2D uTarget; uniform float aspect,radius; uniform vec4 color; uniform vec2 point;
    void main(){ vec2 p=vUv-point; p.x*=aspect; gl_FragColor=texture2D(uTarget,vUv)+exp(-dot(p,p)/radius)*color; }`,
  // one pointer segment per frame (a capsule), so fast moves stay continuous in a single pass
  seg: HEAD + `uniform sampler2D uTarget; uniform float aspect,radius; uniform vec4 color; uniform vec2 a,b;
    void main(){ vec2 pa=(vUv-a)*vec2(aspect,1.),ba=(b-a)*vec2(aspect,1.); float h=clamp(dot(pa,ba)/max(dot(ba,ba),1e-9),0.,1.);
      vec2 d=pa-ba*h; gl_FragColor=texture2D(uTarget,vUv)+exp(-dot(d,d)/radius)*color; }`,
  // a spinning eddy (velocity only)
  vortex: HEAD + `uniform sampler2D uTarget; uniform float aspect,radius,strength; uniform vec2 point;
    void main(){ vec2 p=(vUv-point)*vec2(aspect,1.); float e=exp(-dot(p,p)/radius);
      gl_FragColor=texture2D(uTarget,vUv)+vec4(vec2(-p.y,p.x)*inversesqrt(radius)*strength*e,0.,0.); }`,
  // an outward blast around an ellipse (the logo), ragged by noise so it tears unevenly
  burst: HEAD + NOISE + `uniform sampler2D uTarget; uniform float aspect,strength,seed; uniform vec2 point,size;
    void main(){ vec2 p=(vUv-point)*vec2(aspect,1.); vec2 q=p/size; float r=length(q)+1e-4; float an=atan(q.y,q.x);
      float env=smoothstep(0.,.55,r)*exp(-max(r-1.,0.)*1.6);
      float n=.45+1.1*vnoise(vec2(an*2.3+seed,seed*1.7));
      vec2 dir=normalize(p+1e-5), tan=vec2(-dir.y,dir.x);
      vec2 v=dir*strength*n*env+tan*strength*.5*(vnoise(vec2(an*3.1-seed,seed+5.))-.5)*env;
      gl_FragColor=texture2D(uTarget,vUv)+vec4(v,0.,0.); }`,
  // the loader's logo, rasterised, written into the ink
  stamp: HEAD + `uniform sampler2D uTarget,uLogo; uniform vec4 rect; uniform vec4 color;
    void main(){ vec2 l=(vUv-rect.xy)/rect.zw; float m=0.;
      if(l.x>0.&&l.x<1.&&l.y>0.&&l.y<1.) m=texture2D(uLogo,l).a;
      gl_FragColor=texture2D(uTarget,vUv)+color*m; }`,
  advect: HEAD + `uniform sampler2D uVel,uSrc; uniform vec2 velTexel,srcTexel; uniform float dt,fade,spread; uniform vec3 diss;
    void main(){ vec2 c=vUv-dt*texture2D(uVel,vUv).xy*velTexel; vec3 v=texture2D(uSrc,c).xyz;
      if(spread>0.){ vec3 nb=.25*(texture2D(uSrc,c+vec2(srcTexel.x,0.)).xyz+texture2D(uSrc,c-vec2(srcTexel.x,0.)).xyz+texture2D(uSrc,c+vec2(0.,srcTexel.y)).xyz+texture2D(uSrc,c-vec2(0.,srcTexel.y)).xyz); v=mix(v,nb,spread); }
      v=v/(1.+diss*dt); if(fade>0.) v=max(v-fade*dt,0.); gl_FragColor=vec4(v,1.); }`,
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
    void main(){ float L=texture2D(uP,vL).x,R=texture2D(uP,vR).x,T=texture2D(uP,vT).x,B=texture2D(uP,vB).x; gl_FragColor=vec4(texture2D(uVel,vUv).xy-vec2(R-L,T-B),0.,1.); }`,
  scale: HEAD + `uniform sampler2D uTex; uniform float value; void main(){ gl_FragColor=value*texture2D(uTex,vUv); }`,
  // dye: r = ink density, g = density x tone (0 deep .. 1 sky), b = white (the logo, fades fast)
  display: HEAD + NOISE + `uniform sampler2D uDye; uniform float aspect,time,calmAmt,calmK,scrim,bleed,maxD,rimK; uniform vec2 bleedC;
    uniform vec3 base0,base1,glowC,loaderC,inkDeep,inkSky,inkLight; uniform vec4 calm; uniform mat3 hue;
    void main(){
      vec3 col=mix(base1,base0,smoothstep(.0,.75,vUv.y));
      vec2 g=(vUv-vec2(.5,.45))*vec2(aspect*.62,1.); col+=glowC*.16*exp(-dot(g,g)*3.);
      // loader: the dark cover bleeds open from the centre (the ink itself is never masked, so the logo ink shows at once)
      float rim=0.;
      if(bleed<1.){
        vec2 q=(vUv-bleedC)*vec2(aspect,1.); float dist=length(q);
        float nb=fbm(q*3.1+7.)*.62+fbm(q*12.+3.)*.16;
        float f=bleed*(maxD+.95)-.3-dist-(nb-.4)*.62;
        float amt=max(smoothstep(0.,.02,f),smoothstep(-.11,0.,f)*.3+smoothstep(-.035,0.,f)*.25);
        rim=smoothstep(-.07,0.,f)*(1.-smoothstep(0.,.06,f));
        col=mix(loaderC,col,clamp(amt,0.,1.));
      }
      vec2 cz=(vUv-calm.xy)/calm.zw; float zr=length(cz);
      float k=1.-calmAmt*calmK*smoothstep(1.5,.62,zr);
      vec3 d=texture2D(uDye,vUv).rgb; float a=d.r*k, tone=clamp(d.g/(d.r+1e-4),0.,1.), w=d.b*k;
      float cover=1.-exp(-a*1.5);
      vec3 ink=mix(inkDeep,inkSky,tone);
      ink=mix(ink,inkLight,smoothstep(1.1,3.2,a)*.6);
      ink=mix(ink,vec3(.965,.975,1.),smoothstep(.12,1.,w));
      col=mix(col,ink,clamp(cover+smoothstep(.1,.7,w),0.,1.));
      col=mix(col,inkSky,rim*rimK);
      col*=1.-scrim*calmAmt*exp(-zr*zr*1.15);
      col=hue*col;
      col+=(hash(gl_FragCoord.xy+fract(time*.61)*97.)-.5)/255.;   // dither: no banding on the dark gradient
      gl_FragColor=vec4(clamp(col,0.,1.),1.); }`
};

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
// same matrix as CSS hue-rotate(), so the DOM bits we tint match the canvas
export function hueMatrix(deg) {
  const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const r = [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928];
  const g = [.213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283];
  const b = [.213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072];
  return new Float32Array([r[0], g[0], b[0], r[1], g[1], b[1], r[2], g[2], b[2]]);   // column-major
}
export const hueAt = t => HERO_FX.hueMax * (.5 - .5 * Math.cos(t / HERO_FX.huePeriod * Math.PI * 2));

export function initHomeHero(hero, { intro = false, copySel = '.home-hero_heading-wrapper, .home-hero_text, .home-hero_button-wrapper', wrapSel = '.home-hero_ink-wrapper' } = {}) {
  const F = HERO_FX;
  const root = document.documentElement;
  const wrap = hero.querySelector(wrapSel) || hero;
  const canvas = document.createElement('canvas'); canvas.className = 'gz-hero-ink'; canvas.setAttribute('aria-hidden', 'true');
  wrap.appendChild(canvas);

  const noop = () => Promise.resolve();
  const api = { ok: false, burst: noop, ready: Promise.resolve() };
  const params = { alpha: false, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false, powerPreference: 'low-power' };
  let gl = canvas.getContext('webgl2', params); const gl2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', params);
  let texType, internal, linear = true, ok = !!gl;
  if (ok) {
    if (gl2) { gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'); texType = gl.HALF_FLOAT; internal = gl.RGBA16F; }
    else { const hf = gl.getExtension('OES_texture_half_float'); if (!hf) ok = false; else { texType = hf.HALF_FLOAT_OES; internal = gl.RGBA; linear = !!gl.getExtension('OES_texture_half_float_linear'); } }
  }
  const fail = () => { canvas.remove(); hero.classList.remove('is-ink-live'); return api; };
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
  } catch (e) { console.warn('[givzey] hero ink disabled', e); return fail(); }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.enableVertexAttribArray(0); gl.disable(gl.BLEND);

  const textures = [];
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
    textures.push(tex, fb);
    return { tex, fb, w, h, tx: 1 / w, ty: 1 / h, good, bind(unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); return unit; } };
  }
  const dbl = (w, h) => { let a = fbo(w, h), b = fbo(w, h); return { get read() { return a; }, get write() { return b; }, swap() { const t = a; a = b; b = t; }, w, h, tx: 1 / w, ty: 1 / h, good: a.good && b.good }; };
  const use = name => { gl.useProgram(P[name].p); return P[name].u; };
  const blit = t => { if (t) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.viewport(0, 0, t.w, t.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); } gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0); };

  // ---- sizing / quality ----
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const lowDevice = saveData || (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
  let low = false, dprCap = F.dprMax, aspect = 1, simH = F.simRes, iter = F.iter;
  let vel, dye, div, curlT, prs;
  function freeAll() { for (let i = 0; i < textures.length; i += 2) { gl.deleteTexture(textures[i]); gl.deleteFramebuffer(textures[i + 1]); } textures.length = 0; }
  function allocate() {
    freeAll();
    low = lowDevice || innerWidth < 820 || matchMedia('(hover: none)').matches || forceLow;
    const dpr = Math.min(devicePixelRatio || 1, low ? Math.min(dprCap, 1.25) : dprCap);
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr)); canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    aspect = canvas.width / canvas.height;
    const size = base => aspect >= 1 ? [Math.round(base * aspect), base] : [base, Math.round(base / aspect)];
    const [sw, sh] = size(low ? F.simResLow : F.simRes), [dw, dh] = size(low ? F.dyeResLow : F.dyeRes);
    simH = sh; iter = low ? F.iterLow : F.iter;
    vel = dbl(sw, sh); dye = dbl(dw, dh); div = fbo(sw, sh); curlT = fbo(sw, sh); prs = dbl(sw, sh);
    if (!vel.good || !dye.good) ok = false;
  }
  let forceLow = /[?&]gzlow\b/.test(location.search);

  // ---- primitives ----
  const corr = r => aspect > 1 ? r * aspect : r;
  const VS = () => simH * 60;   // uv-per-frame -> sim texels per second
  function splat(target, x, y, c, radius) {
    const u = use('splat'); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.point, x, y); gl.uniform1f(u.radius, corr(radius));
    gl.uniform1i(u.uTarget, target.read.bind(0)); gl.uniform4f(u.color, c[0], c[1], c[2], c[3] || 0); blit(target.write); target.swap();
  }
  function seg(target, a, b, c, radius) {
    const u = use('seg'); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.a, a[0], a[1]); gl.uniform2f(u.b, b[0], b[1]); gl.uniform1f(u.radius, corr(radius));
    gl.uniform1i(u.uTarget, target.read.bind(0)); gl.uniform4f(u.color, c[0], c[1], c[2], c[3] || 0); blit(target.write); target.swap();
  }
  function vortex(x, y, radius, strength) {
    const u = use('vortex'); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.point, x, y); gl.uniform1f(u.radius, corr(radius)); gl.uniform1f(u.strength, strength * simH / 128);
    gl.uniform1i(u.uTarget, vel.read.bind(0)); blit(vel.write); vel.swap();
  }
  function blast(x, y, sx, sy, strength, seed) {
    const u = use('burst'); gl.uniform1f(u.aspect, aspect); gl.uniform2f(u.point, x, y); gl.uniform2f(u.size, sx, sy);
    gl.uniform1f(u.strength, strength * simH / 128); gl.uniform1f(u.seed, seed);
    gl.uniform1i(u.uTarget, vel.read.bind(0)); blit(vel.write); vel.swap();
  }
  const inkC = (amt, tone, white = 0) => [amt, amt * tone, white, 0];
  // a soft drop: ink + an uneven outward ring
  function drop(x, y, amt, size, tone) {
    splat(dye, x, y, inkC(amt, tone), .0022 * size);
    blast(x, y, .05 * size, .05 * size, 210 * Math.sqrt(size), Math.random() * 50);
  }

  function step(dt) {
    let u = use('curl'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(curlT);
    u = use('vorticity'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uCurl, curlT.bind(1)); gl.uniform1f(u.curl, F.curl); gl.uniform1f(u.dt, dt); blit(vel.write); vel.swap();
    u = use('divergence'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uVel, vel.read.bind(0)); blit(div);
    u = use('scale'); gl.uniform1i(u.uTex, prs.read.bind(0)); gl.uniform1f(u.value, .8); blit(prs.write); prs.swap();
    u = use('pressure'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uDiv, div.bind(0));
    for (let i = 0; i < iter; i++) { gl.uniform1i(u.uP, prs.read.bind(1)); blit(prs.write); prs.swap(); }
    u = use('gradient'); gl.uniform2f(u.texel, vel.tx, vel.ty); gl.uniform1i(u.uP, prs.read.bind(0)); gl.uniform1i(u.uVel, vel.read.bind(1)); blit(vel.write); vel.swap();
    u = use('advect'); gl.uniform2f(u.velTexel, vel.tx, vel.ty); gl.uniform1f(u.dt, dt);
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, vel.read.bind(0)); gl.uniform3f(u.diss, F.velDiss, F.velDiss, F.velDiss); gl.uniform1f(u.fade, 0); gl.uniform1f(u.spread, 0); blit(vel.write); vel.swap();
    gl.uniform1i(u.uVel, vel.read.bind(0)); gl.uniform1i(u.uSrc, dye.read.bind(1)); gl.uniform3f(u.diss, F.dyeDiss, F.dyeDiss, F.whiteDiss); gl.uniform1f(u.fade, F.dyeFade); gl.uniform1f(u.spread, F.spread);
    gl.uniform2f(u.srcTexel, dye.tx * 1.5, dye.ty * 1.5); blit(dye.write); dye.swap();
  }

  // ---- copy zone (headline + subhead + button) ----
  const copyEls = [...hero.querySelectorAll(copySel)];
  let calmRect = [.5, .55, .3, .25];
  function measureCalm() {
    const c = canvas.getBoundingClientRect(); if (!c.width || !c.height || !copyEls.length) return;
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    for (const el of copyEls) { const q = el.getBoundingClientRect(); if (!q.width) continue; l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom); }
    if (r < l) return;
    // half-extents, a little larger than the copy box so the shade feathers out beyond it
    calmRect = [((l + r) / 2 - c.left) / c.width, 1 - ((t + b) / 2 - c.top) / c.height, Math.max(.12, (r - l) / c.width * .62), Math.max(.12, (b - t) / c.height * .7)];
  }
  const inCalm = (x, y, m = 1) => { const dx = (x - calmRect[0]) / calmRect[2], dy = (y - calmRect[1]) / calmRect[3]; return dx * dx + dy * dy < m * m; };

  // ---- state ----
  const S = { time: 0, calm: intro ? 0 : 1, bleed: intro ? 0 : 1, hue: 0 };
  const mode = revealMode();
  const C = { base0: hex(F.base[0]), base1: hex(F.base[1]), glow: hex(F.glow), loader: hex(mode === 'ink' ? F.paper : F.loader), deep: hex(F.inkDeep), sky: hex(F.inkSky), light: hex(F.inkLight) };
  let hueM = hueMatrix(0), cssHue = -1, bleedC = [.5, .5];   // bleedC: where the loader bleed opens from (the logo)
  function render() {
    const u = use('display');
    gl.uniform1i(u.uDye, dye.read.bind(0)); gl.uniform1f(u.aspect, aspect); gl.uniform1f(u.time, S.time);
    gl.uniform1f(u.calmAmt, S.calm); gl.uniform1f(u.calmK, F.calm); gl.uniform1f(u.scrim, F.scrim); gl.uniform1f(u.bleed, S.bleed); gl.uniform1f(u.rimK, mode === 'ink' ? 0 : .45); gl.uniform2f(u.bleedC, bleedC[0], bleedC[1]);
    gl.uniform1f(u.maxD, Math.hypot(aspect * Math.max(bleedC[0], 1 - bleedC[0]), Math.max(bleedC[1], 1 - bleedC[1])));
    gl.uniform3fv(u.base0, C.base0); gl.uniform3fv(u.base1, C.base1); gl.uniform3fv(u.glowC, C.glow); gl.uniform3fv(u.loaderC, C.loader);
    gl.uniform3fv(u.inkDeep, C.deep); gl.uniform3fv(u.inkSky, C.sky); gl.uniform3fv(u.inkLight, C.light);
    gl.uniform4f(u.calm, calmRect[0], calmRect[1], calmRect[2], calmRect[3]); gl.uniformMatrix3fv(u.hue, false, hueM);
    blit(null);
  }
  function setHue(deg) {
    S.hue = deg; hueM = hueMatrix(deg);
    // the headline gradient + button follow the same hue (CSS hue-rotate uses this exact matrix); throttled
    if (Math.abs(deg - cssHue) > .6) { cssHue = deg; root.style.setProperty('--gz-hue', deg.toFixed(1) + 'deg'); }
  }

  // ---- pointer: smoothed follow, capsule trail, eddies shed beside the path (GivSplash Fluid) ----
  const ptr = { tx: 0, ty: 0, bx: 0, by: 0, over: false, emit: false, travel: 0, side: 1, phase: Math.random(), last: -10 };
  let live = !intro;   // the cursor only paints once the hero is revealed
  const toUv = (cx, cy) => { const c = canvas.getBoundingClientRect(); return [(cx - c.left) / c.width, 1 - (cy - c.top) / c.height]; };
  const aim = (cx, cy) => { [ptr.tx, ptr.ty] = toUv(cx, cy); ptr.over = true; ptr.last = S.time; };
  hero.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; aim(e.clientX, e.clientY); });
  hero.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { ptr.over = false; ptr.emit = false; } });
  // touch: dragging a finger paints too (passive, so the page still scrolls)
  hero.addEventListener('touchstart', e => { const t = e.touches[0]; if (!t) return; aim(t.clientX, t.clientY); ptr.emit = false;
    if (live && !REDUCED) { const [x, y] = toUv(t.clientX, t.clientY); if (!inCalm(x, y, .9)) drop(x, y, .45, .8, .4 + Math.random() * .4); } }, { passive: true });
  hero.addEventListener('touchmove', e => { const t = e.touches[0]; if (t) aim(t.clientX, t.clientY); }, { passive: true });
  const endTouch = () => { ptr.over = false; ptr.emit = false; };
  hero.addEventListener('touchend', endTouch, { passive: true }); hero.addEventListener('touchcancel', endTouch, { passive: true });

  function paintStroke(a, b, ink, push, tone) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dist = Math.hypot(dx * aspect, dy);
    if (dist < 2e-5 || dist > .25) return dist;
    // a frame's segment is short next to the brush, so consecutive capsules overlap ~2r/len times:
    // scale by len/r so ink and push per unit of path stay constant whatever the frame rate or speed
    const kd = Math.min(1, dist / Math.sqrt(corr(F.trailRadius))), kv = Math.min(1, dist / Math.sqrt(corr(F.trailVelRadius)));
    seg(vel, a, b, [dx * aspect * VS() * push * kv, dy * VS() * push * kv, 0, 0], F.trailVelRadius);
    seg(dye, a, b, inkC(ink * kd, tone), F.trailRadius);
    return dist;
  }
  function runPointer(dt) {
    if (!ptr.over || !live || REDUCED) { ptr.emit = false; return; }
    const s = 1 - Math.exp(-F.trailSmooth * dt);
    if (!ptr.emit) { ptr.bx = ptr.tx; ptr.by = ptr.ty; ptr.emit = true; return; }
    const nx = ptr.bx + (ptr.tx - ptr.bx) * s, ny = ptr.by + (ptr.ty - ptr.by) * s;
    const dx = nx - ptr.bx, dy = ny - ptr.by;
    ptr.phase += Math.hypot(dx * aspect, dy) * 2.4;
    const tone = .5 - .5 * Math.cos(ptr.phase * 6.2832);   // tones deepen and lighten along one gesture
    const dist = paintStroke([ptr.bx, ptr.by], [nx, ny], F.trailInk, F.trailPush, .15 + .8 * tone);
    if (dist > 2e-5 && dist < .25) {
      ptr.travel += dist;
      if (ptr.travel > F.swirlEvery) {
        ptr.travel = 0; ptr.side = -ptr.side; const n = Math.hypot(dx * aspect, dy) || 1, ox = -dy / n, oy = dx * aspect / n;
        vortex(nx + ox * ptr.side * F.swirlOffset / aspect, ny + oy * ptr.side * F.swirlOffset, F.swirlSize, ptr.side * F.swirlSpeed);
      }
    }
    ptr.bx = nx; ptr.by = ny;
  }

  // ---- ambient hand: when idle, a slow invisible brush paints the odd calm stroke around the edges ----
  const hand = { x: .12, y: .3, vx: 0, vy: 0, tx: .2, ty: .7, next: 0, pen: false, until: 0, seed: Math.random() * 10, phase: 0 };
  function pickTarget() {
    for (let i = 0; i < 20; i++) { const x = .06 + Math.random() * .88, y = .1 + Math.random() * .8; if (!inCalm(x, y, 1.35)) return [x, y]; }
    return [Math.random() < .5 ? .1 : .9, .2 + Math.random() * .6];
  }
  function runAmbient(dt) {
    if (!live || REDUCED || S.time - ptr.last < F.ambientIdle) { hand.pen = false; return; }
    const t = S.time;
    if (t > hand.until) {   // alternate: paint for a few seconds, rest for a few
      hand.pen = !hand.pen; hand.until = t + (hand.pen ? 2.6 + Math.random() * 2.4 : 2.5 + Math.random() * 3.5);
      if (hand.pen) { const [x, y] = pickTarget(); hand.x = x; hand.y = y; hand.vx = hand.vy = 0; hand.next = 0; }
    }
    if (!hand.pen) return;
    if (t > hand.next) { [hand.tx, hand.ty] = pickTarget(); hand.next = t + 1.1 + Math.random() * 1.4; }
    const kk = 5, damp = 2.6;
    let ax = (hand.tx - hand.x) * kk - hand.vx * damp, ay = (hand.ty - hand.y) * kk - hand.vy * damp;
    ax += Math.sin(t * 1.7 + hand.seed) * .35; ay += Math.cos(t * 1.3 + hand.seed) * .35;
    hand.vx += ax * dt; hand.vy += ay * dt;
    const sp = Math.hypot(hand.vx, hand.vy), mx = F.ambientSpeed; if (sp > mx) { hand.vx *= mx / sp; hand.vy *= mx / sp; }
    const nx = Math.min(.98, Math.max(.02, hand.x + hand.vx * dt)), ny = Math.min(.98, Math.max(.02, hand.y + hand.vy * dt));
    // lift the brush as it nears the copy
    const fade = inCalm(nx, ny, 1.15) ? 0 : 1;
    hand.phase += Math.hypot((nx - hand.x) * aspect, ny - hand.y) * 2;
    if (fade) paintStroke([hand.x, hand.y], [nx, ny], F.ambientInk, F.ambientPush, .1 + .5 * (.5 - .5 * Math.cos(hand.phase * 6.2832)));
    hand.x = nx; hand.y = ny;
  }

  // ---- falling drops: a droplet falls from the top of the hero, lands with a ring and sinks as a soft plume ----
  const fx = document.createElement('div'); fx.className = 'gz-hero-drips'; fx.setAttribute('aria-hidden', 'true');
  canvas.after(fx);
  const drips = { next: -1, pending: [] };
  function dripSpot() {
    for (let i = 0; i < 24; i++) { const x = .05 + Math.random() * .9, y = .18 + Math.random() * .6; if (!inCalm(x, y, 1.45)) return [x, y]; }
    return [Math.random() < .5 ? .08 + Math.random() * .12 : .8 + Math.random() * .12, .25 + Math.random() * .5];
  }
  function launchDrip(scale = 1) {
    const [x, y] = dripSpot(), W = canvas.clientWidth, H = canvas.clientHeight; if (!W || !H) return;
    const px = x * W, py = (1 - y) * H, size = (7 + Math.random() * 4) * scale, fall = .55 + py / 900;
    const el = document.createElement('span'); el.className = 'gz-hero-drip'; el.style.left = px.toFixed(1) + 'px';
    el.style.setProperty('--s', size.toFixed(1) + 'px'); el.style.setProperty('--y', (py - size * 1.3).toFixed(1) + 'px'); el.style.setProperty('--d', fall.toFixed(2) + 's');
    fx.appendChild(el);
    drips.pending.push({ x, y, px, py, at: S.time + fall, el, scale });
  }
  function landDrip(d) {
    d.el.remove();
    const ring = document.createElement('span'); ring.className = 'gz-hero-ring';
    ring.style.left = d.px.toFixed(1) + 'px'; ring.style.top = d.py.toFixed(1) + 'px'; ring.style.setProperty('--r', (54 * d.scale).toFixed(0) + 'px');
    fx.appendChild(ring); setTimeout(() => ring.remove(), 1200);
    const sz = F.dripSize * d.scale;
    splat(dye, d.x, d.y, inkC(F.dripInk, .45 + Math.random() * .45), .0016 * sz);
    blast(d.x, d.y, .03 * sz, .03 * sz, 120 * Math.sqrt(sz), Math.random() * 50);
    splat(vel, d.x, d.y - .01, [0, -F.dripSink * simH / 128, 0, 0], .0012 * sz);   // the plume sinks
  }
  function runDrips() {
    if (!live || REDUCED) return;
    if (drips.next < 0) drips.next = S.time + F.dripFirst;
    if (S.time >= drips.next) {
      launchDrip(.85 + Math.random() * .35);
      if (Math.random() < .3) setTimeout(() => live && launchDrip(.6 + Math.random() * .2), 380 + Math.random() * 500);   // the odd second drip
      drips.next = S.time + F.dripEvery[0] + Math.random() * (F.dripEvery[1] - F.dripEvery[0]);
    }
    for (let i = drips.pending.length - 1; i >= 0; i--) if (S.time >= drips.pending[i].at) landDrip(drips.pending.splice(i, 1)[0]);
  }

  // ---- loader hand-off: stamp the logo, blow it apart, bleed the hero open ----
  const logoTex = gl.createTexture();
  let logoImg = null;
  api.cover = () => { S.bleed = 0; S.calm = 0; live = false; for (const t of [vel.read, vel.write, dye.read, dye.write, prs.read, prs.write]) { gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); } render(); };   // QA replay: back to the loader screen
  api.prepareLogo = svgString => {
    const s = svgString.replace(/currentColor/g, '#ffffff').replace('<svg ', '<svg width="1440" height="370" ');
    const img = new Image(); img.decoding = 'async';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
    logoImg = img.decode ? img.decode().then(() => img, () => null) : new Promise(r => { img.onload = () => r(img); img.onerror = () => r(null); });
    return logoImg;
  };
  let introState = null;
  const easeIO = x => { x = Math.min(1, Math.max(0, x)); return x < .5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  // timings after the hand-off (s): bleed runs 0 -> bleed in `steps` sprite-like frames, copy reveals at reveal, the intro ends at end
  // opening: [time, x, y, size] soft drops spread around the copy so the hero opens full of ink
  const TIMING = {
    burst: { bleed: 1.15, steps: 22, reveal: .6, end: 1.7, calmIn: 1.1,
      opening: [[.2, .16, .7, 1.4], [.34, .85, .3, 1.3], [.5, .8, .8, 1.05], [.68, .15, .24, 1.15]] },
    // Header V1: a slower bleed across paper, the drops land as it finishes, the copy comes in once the screen is ink
    ink: { bleed: 1.75, steps: 26, reveal: 1.8, end: 3.1, calmIn: 1.3,
      opening: [[1.2, .8, .46, 1.4], [1.55, .3, .74, 1.1], [1.95, .86, .76, 1.05], [2.45, .48, .2, 1.0], [2.95, .16, .36, 1.1]] }
  };
  const T = TIMING[mode];
  async function stampLogo(lr) {
    const img = logoImg ? await Promise.race([logoImg, new Promise(r => setTimeout(() => r(null), 150))]) : null;
    const c = canvas.getBoundingClientRect();
    if (!img || !lr || !lr.width || !c.width) return null;
    const pxW = Math.min(1024, Math.ceil(lr.width / c.width * dye.w * 2)), pxH = Math.ceil(pxW * lr.height / lr.width);
    const cv = document.createElement('canvas'); cv.width = pxW; cv.height = pxH;
    cv.getContext('2d').drawImage(img, 0, 0, pxW, pxH);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, logoTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const rect = [(lr.left - c.left) / c.width, 1 - (lr.bottom - c.top) / c.height, lr.width / c.width, lr.height / c.height];
    const u = use('stamp'); gl.uniform1i(u.uTarget, dye.read.bind(0)); gl.uniform1i(u.uLogo, (gl.activeTexture(gl.TEXTURE1), gl.bindTexture(gl.TEXTURE_2D, logoTex), 1));
    gl.uniform4f(u.rect, rect[0], rect[1], rect[2], rect[3]); gl.uniform4f(u.color, 1.7, 1.7 * .85, 1.1, 0); blit(dye.write); dye.swap();
    return rect;
  }
  // svgEl: the loader's logo (measured so the ink lands exactly where it is). Resolves when the intro is over.
  api.burst = (svgEl, o = {}) => new Promise(async res => {
    S.bleed = 0; S.calm = 0; live = false;
    const once = fn => { let done = false; return () => { if (!done) { done = true; fn(); } }; };
    const I = { t: 0, fired: 0,
      reveal: once(() => { live = true; measureCalm(); o.onReveal && o.onReveal(); }),
      uncover: once(() => { o.onUncover && o.onUncover(); }) };
    I.finish = once(() => { I.done = true; if (introState === I) introState = null; S.bleed = 1; S.calm = 1; I.reveal(); I.uncover(); res(); });
    // safety nets in wall time (background tab, weak GPU): the page is never held
    if (!S.manual) { setTimeout(I.reveal, (T.reveal + .5) * 1000); setTimeout(I.finish, (T.end + .7) * 1000); }   // S.manual: QA stepping
    if (mode === 'ink') {
      // V1: nothing is stamped or blown apart; the ink simply bleeds out from behind the logo
      const lr = svgEl && svgEl.getBoundingClientRect(), c = canvas.getBoundingClientRect();
      if (lr && lr.width && c.width) bleedC = [(lr.left + lr.width / 2 - c.left) / c.width, Math.min(.9, Math.max(.1, 1 - (lr.top + lr.height / 2 - c.top) / c.height))];
      else bleedC = [.5, .5];
      o.onStamp && o.onStamp();
      if (!I.done) introState = I;
      return;
    }
    const rect = await stampLogo(svgEl && svgEl.getBoundingClientRect());   // measured before the lockup starts to move
    o.onStamp && o.onStamp();
    const cx = rect ? rect[0] + rect[2] / 2 : .5, cy = rect ? rect[1] + rect[3] / 2 : .5;
    bleedC = [cx, Math.min(.9, Math.max(.1, cy))];
    const hw = rect ? rect[2] * aspect / 2 : .12, hh = rect ? rect[3] / 2 : .03;
    // the blast: one wide tear around the lockup + a hard kick right at the symbol
    // the blast comes in three pulses, so the lockup first tears at its edges, then floods outward
    I.kicks = [[.05, .4], [.14, .33], [.26, .27]].map(([at, k]) => ({ at, k, done: false }));
    I.kick = k => {
      const seed = Math.random() * 40;
      blast(cx, cy, hw * 1.05, Math.max(hh * 2.2, .05), F.burst * k, seed);
      if (rect) blast(rect[0] + rect[2] * .1, cy, hh * 1.7, hh * 1.7, F.burst * .5 * k, seed + 9);
    };
    if (!rect) splat(dye, cx, cy, inkC(2.2, .8, 1.6), .004);
    if (!I.done) introState = I;
  });
  api.endIntro = () => { if (introState) introState.finish(); };   // the page's hard cap: skip to the settled hero
  function runIntro(dt) {
    const I = introState; I.t += dt; const t = I.t;
    if (I.kicks) for (const q of I.kicks) if (!q.done && t >= q.at) { q.done = true; I.kick(q.k); }
    S.bleed = Math.min(1, Math.floor(easeIO(t / T.bleed) * T.steps) / T.steps + (t > T.bleed ? 1 : 0));   // stepped, like sprite frames
    while (I.fired < T.opening.length && t >= T.opening[I.fired][0]) { const d = T.opening[I.fired++]; drop(d[1], d[2], .5 + Math.random() * .2, d[3], .25 + Math.random() * .55); }
    if (t >= T.reveal) I.reveal();
    if (t >= T.bleed) I.uncover();
    S.calm = smooth((t - T.reveal) / T.calmIn);
    if (t >= T.end) I.finish();
  }

  // ---- loop ----
  let prev = performance.now(), visible = true, raf = 0, drawn = false;
  const perf = { n: 0, sum: 0, level: 0 };
  function tick(dt, raw) {
    S.time += dt;
    setHue(REDUCED ? 0 : hueAt(S.time));
    if (introState) runIntro(Math.min(raw, .1));
    runPointer(dt); runAmbient(dt); runDrips();
    step(dt * F.simSpeed); render();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden || !ok || S.manual) { prev = now; return; }
    const raw = (now - prev) / 1000, dt = Math.min(raw, 1 / 30); prev = now;
    tick(dt, raw);
    if (!drawn) { drawn = true; hero.classList.add('is-ink-live'); root.classList.add('gz-paper'); }
    // GPU watchdog: low-res simulation first, then resolution
    if (raw < 1) { perf.sum += raw; if (++perf.n === 30) { const avg = perf.sum / perf.n; perf.n = perf.sum = 0;
      if (avg > .026 && perf.level < 2) { perf.level++; if (perf.level === 1) forceLow = true; else dprCap = .75; reallocate(); } } }
  }
  function reallocate() {
    // keep it simple: a fresh field (only ever happens on resize or a struggling GPU)
    allocate(); measureCalm();
  }
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(hero);
  // the nav's CTA takes the scene's hue while it sits over the hero (one colour per area), brand blue elsewhere
  new IntersectionObserver(es => { root.classList.toggle('gz-hero-in', es[0].isIntersecting); }, { rootMargin: '0px 0px -88% 0px' }).observe(hero);
  let rz = 0, lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => {
    if (!ok) return; measureCalm();
    // mobile URL bars change the height constantly: only a width change (or a big height change) rebuilds the field
    if (Math.abs(innerWidth - lastW) < 2 && Math.abs(innerHeight - lastH) < 160) return;
    lastW = innerWidth; lastH = innerHeight; reallocate(); if (REDUCED) staticFrame();
  }, 200); });

  allocate();
  if (!ok) return fail();
  measureCalm();
  api.ok = true;
  api.mode = mode;

  function staticFrame() {
    S.bleed = 1; S.calm = 1; live = false; setHue(0);
    const spots = [[.16, .72, 1.2], [.84, .28, 1.1], [.82, .78, .9], [.12, .25, .8], [.5, .1, .9]];
    for (const [x, y, s] of spots) drop(x, y, 1.3, s, .2 + Math.random() * .6);
    for (let i = 0; i < 90; i++) step(1 / 60);
    render(); hero.classList.add('is-ink-live'); root.classList.add('gz-paper');
  }
  if (REDUCED) staticFrame();
  else raf = requestAnimationFrame(frame);

  if (/[?&]gzdebug\b/.test(location.search)) window.__gzHero = { S, F, ptr, hand, mode, get intro() { return !!introState; }, get calmRect() { return calmRect; }, get low() { return low; }, get level() { return perf.level; },
    // QA: run the simulation forward synchronously (software GPUs can't hold real time)
    advance(sec) { const n = Math.round(sec * 30); for (let i = 0; i < n; i++) tick(1 / 30, 1 / 30); },
    setTime(t) { S.time = t; setHue(hueAt(t)); render(); },
    // dye stats (WebGL2 only): max / mean density and how much of the field is visibly inked
    probe() { const t = dye.read; gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb); const px = new Float32Array(t.w * t.h * 4);
      try { gl.readPixels(0, 0, t.w, t.h, gl.RGBA, gl.FLOAT, px); } catch (e) { return String(e); }
      let mx = 0, sum = 0, inked = 0; for (let i = 0; i < px.length; i += 4) { const a = px[i]; sum += a; if (a > mx) mx = a; if (a > .3) inked++; }
      return { max: +mx.toFixed(3), mean: +(sum / (px.length / 4)).toFixed(4), inked: +(inked / (px.length / 4)).toFixed(3) }; },
    drip() { launchDrip(1); },
    clear() { introState = null; api.cover(); S.bleed = 1; S.calm = 1; live = true; render(); },
    stroke(pts, dt = 1 / 60) { for (const [x, y] of pts) { ptr.tx = x; ptr.ty = y; ptr.over = true; ptr.last = S.time; tick(dt, dt); } ptr.over = false; },
    // average luminance + contrast with white text over canvas-px rects [x,y,w,h] (css px, relative to the hero)
    sample(rects) { render(); const out = [], c = canvas.getBoundingClientRect(), sx = canvas.width / c.width, sy = canvas.height / c.height;
      for (const [x, y, w, h] of rects) { const W = Math.max(1, Math.round(w * sx)), H = Math.max(1, Math.round(h * sy)); const px = new Uint8Array(W * H * 4);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(Math.round(x * sx), Math.round(canvas.height - (y + h) * sy), W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
        let maxL = 0, sum = 0; const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
        for (let i = 0; i < px.length; i += 16) { const L = .2126 * lin(px[i]) + .7152 * lin(px[i + 1]) + .0722 * lin(px[i + 2]); sum += L; if (L > maxL) maxL = L; }
        const avg = sum / (px.length / 16); out.push({ avg: +avg.toFixed(4), max: +maxL.toFixed(4), contrastAvg: +(1.05 / (avg + .05)).toFixed(1), contrastWorst: +(1.05 / (maxL + .05)).toFixed(1) }); }
      return out; } };
  return api;
}
