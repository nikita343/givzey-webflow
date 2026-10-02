// Turns a static ink <img> into a living layer: slow liquid drift, a "bloom" reveal, and a
// cursor that stirs the ink (pushes it aside and makes it glow) while hovering the card it lives in.
import { REDUCED } from '../base.js';

const VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv=p*.5+.5; gl_Position=vec4(p,0.,1.); }`;
const FS = `precision mediump float; varying vec2 vUv;
uniform sampler2D uTex; uniform float uTime, uReveal, uHover, uSeed, uFlow, uOpaque; uniform vec2 uMouse, uAspect, uOrigin;
float h(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float n(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<4;i++){ s+=a*n(p); p=p*2.02+11.3; a*=.5; } return s; }
void main(){
  vec2 uv=vUv; float t=uTime*.07+uSeed;
  uv+=uFlow*(.012*vec2(sin(uv.y*5.+t*3.),cos(uv.x*4.-t*2.6))+.005*vec2(sin((uv.x+uv.y)*12.-t*4.),cos((uv.x-uv.y)*10.+t*3.4)));
  // cursor: push the ink outward in a soft ring and swirl it a little
  vec2 d=(uv-uMouse)*uAspect; float r=length(d); float fall=exp(-r*r*9.);
  vec2 dir=r>1e-4? d/r : vec2(0.);
  uv+=(dir*.045+vec2(-dir.y,dir.x)*.03*sin(t*6.))*fall*uHover/uAspect;
  vec4 c=texture2D(uTex,uv);
  float a=c.a;
  // glow where the cursor stirs it
  c.rgb=mix(c.rgb,min(vec3(1.),c.rgb*1.18+.04),fall*uHover*a);
  // bloom reveal: ink spreads from its origin with an organic edge
  float g=fbm(vUv*4.+uSeed*3.);
  float dist=length((vUv-uOrigin)*uAspect)/1.6;
  float m=clamp((uReveal*2.2-dist-(g-.5)*.5)*3.,0.,1.); m=m*m*(3.-2.*m);
  if(uOpaque>.5){ gl_FragColor=vec4(mix(vec3(1.),c.rgb,m),1.); }
  else gl_FragColor=vec4(c.rgb*a*m,a*m);
}`;

export function inkLayer(img, { host, origin = [0, 1], flow = 1, opaque = false, seed = Math.random() * 10 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = img.className + ' gz-ink-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false });
  const state = { reveal: REDUCED ? 1 : 0, hover: 0, hoverT: 0, mouse: [.5, .5], visible: false, ok: !!gl };
  if (!gl) return { state, ready: Promise.resolve(), setReveal() { } };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
  const u = n => gl.getUniformLocation(prog, n);
  const U = { tex: u('uTex'), time: u('uTime'), reveal: u('uReveal'), hover: u('uHover'), seed: u('uSeed'), flow: u('uFlow'), mouse: u('uMouse'), aspect: u('uAspect'), origin: u('uOrigin'), opaque: u('uOpaque') };
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform1i(U.tex, 0); gl.uniform1f(U.seed, seed); gl.uniform1f(U.flow, REDUCED ? 0 : flow); gl.uniform2f(U.origin, origin[0], origin[1]); gl.uniform1f(U.opaque, opaque ? 1 : 0);

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 1.75), w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); gl.viewport(0, 0, canvas.width, canvas.height);
    const a = w / h; gl.uniform2f(U.aspect, Math.max(1, a), Math.max(1, 1 / a));
    draw(performance.now());
  }
  const host0 = img;
  const im = new Image(); im.crossOrigin = 'anonymous';
  im.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im);
    canvas.style.aspectRatio = im.naturalWidth + ' / ' + im.naturalHeight;
    host0.after(canvas); host0.classList.add('gz-ink-src');
    size(); new ResizeObserver(size).observe(canvas);
    new IntersectionObserver(es => { state.visible = es[0].isIntersecting; if (state.visible) loop(); }, { rootMargin: '100px' }).observe(canvas);
    ready();
  };
  let ready; const whenReady = new Promise(r => { ready = r; });
  im.src = img.currentSrc || img.src;

  // hover tracking on the host card
  if (host && !REDUCED && matchMedia('(hover: hover)').matches) {
    host.addEventListener('pointerenter', () => { state.hoverT = 1; loop(); });
    host.addEventListener('pointerleave', () => { state.hoverT = 0; });
    host.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); state.mouse = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height]; });
  }
  let raf = 0, mx = .5, my = .5;
  function draw(now) {
    state.hover += (state.hoverT - state.hover) * .06;
    mx += (state.mouse[0] - mx) * .12; my += (state.mouse[1] - my) * .12;
    gl.uniform1f(U.time, REDUCED ? 0 : now / 1000); gl.uniform1f(U.reveal, state.reveal); gl.uniform1f(U.hover, state.hover); gl.uniform2f(U.mouse, mx, my);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  function loop() {
    if (raf) return;
    const f = now => { raf = 0; draw(now); if (state.visible && (!REDUCED || state.hover > .01)) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
  }
  return { canvas, state, ready: whenReady, setReveal(v) { state.reveal = v; loop(); } };
}
