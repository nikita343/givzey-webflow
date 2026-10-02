// 3D donor figure + phone + season inks (ported from the "Donor Journey Motion" prototype, concept B)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ScreenUI } from './screen-ui.js';
import { SEASONS, clamp, lerp, mix, weights, REDUCE } from './seasons.js';

const deg = Math.PI / 180;
const lin = a => new THREE.Color(a[0] / 255, a[1] / 255, a[2] / 255).convertSRGBToLinear();

const VS = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const INK_FS = `
uniform sampler2D t0,t1,t2,t3; uniform vec4 uW, uK; uniform float uTime, uBias, uOp, uFlip; uniform vec2 uSeed;
varying vec2 vUv;
vec4 sa(sampler2D t, vec2 uv, float k){ vec2 q = vec2((uv.x-0.5)*k+0.5, uv.y); float inb = step(0.0,q.x)*step(q.x,1.0)*step(0.0,q.y)*step(q.y,1.0); return texture2D(t, q, uBias)*inb; }
void main(){
  vec2 uv = vUv; if (uFlip > 0.5) uv.x = 1.0-uv.x;
  float t = uTime*0.06;
  uv += 0.020*vec2(sin(uv.y*6.0+t*3.0+uSeed.x), cos(uv.x*5.0-t*2.4+uSeed.y));
  uv += 0.009*vec2(sin((uv.x+uv.y)*13.0-t*4.2), cos((uv.x-uv.y)*11.0+t*3.3));
  vec4 c = sa(t0,uv,uK.x)*uW.x + sa(t1,uv,uK.y)*uW.y + sa(t2,uv,uK.z)*uW.z + sa(t3,uv,uK.w)*uW.w;
  gl_FragColor = vec4(c.rgb, c.a*uOp);
}`;
const GLOW_FS = `uniform vec3 uCol; uniform float uOp; uniform float uCore; varying vec2 vUv;
void main(){ float d = length(vUv-0.5)*2.0; float a = pow(clamp(1.0-d,0.0,1.0), 2.2); vec3 c = mix(uCol, vec3(1.0), uCore*a); gl_FragColor = vec4(c, a*uOp); }`;
const PT_FS = `uniform vec3 uCol; uniform float uOp; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.05,d)*vA*uOp; gl_FragColor = vec4(uCol, a); }`;
const PT_VS = `attribute float aSize; attribute float aSeed; uniform float uTime, uPR, uH; varying float vA;
void main(){ vec3 p = position; float s = aSeed;
  p.y = mod(p.y + uTime*(.03+.06*s) + 1.3, 2.6) - 1.3;
  p.x += sin(uTime*.35 + s*20.0)*.05;
  vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
  gl_PointSize = aSize*uPR*uH*projectionMatrix[1][1]*0.5/(-mv.z); vA = 0.25+0.5*fract(s*7.13); }`;

function decodeSculpt(buf) {
  const dv = new DataView(buf); const nv = dv.getUint32(0, true), nf = dv.getUint32(4, true), it = dv.getUint32(8, true); let o = 12;
  const pad = n => n + ((4 - n % 4) % 4);
  const q = new Int16Array(buf, o, nv * 3); o += pad(nv * 6);
  const nq = new Int8Array(buf, o, nv * 3); o += pad(nv * 3);
  const aq = new Uint8Array(buf, o, nv); o += pad(nv);
  const wq = new Uint8Array(buf, o, nv * 4); o += pad(nv * 4);
  const idx = it === 1 ? new Uint16Array(buf, o, nf * 3) : new Uint32Array(buf, o, nf * 3);
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), w = new Float32Array(nv * 4);
  for (let i = 0; i < nv * 3; i++) { pos[i] = q[i] / 4000; nor[i] = nq[i] / 127; }
  for (let i = 0; i < nv; i++) { const a = Math.pow((aq[i] & 63) / 63, 1.1); col[i * 3] = a; col[i * 3 + 1] = (aq[i] >> 6) / 3; col[i * 3 + 2] = 0; }
  for (let i = 0; i < nv * 4; i++) w[i] = wq[i] / 255;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aW', new THREE.BufferAttribute(w, 4));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(nv * 2), 2));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}

export async function loadFigure(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('figure ' + res.status);
  let buf = await res.arrayBuffer();
  // some CDNs serve .gz with Content-Encoding and the browser has already inflated it
  const b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x1f && b[1] === 0x8b) {
    if (!('DecompressionStream' in window)) throw new Error('no DecompressionStream');
    buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return decodeSculpt(buf);
}

function makePhone() {
  const w = .077, h = .160, d = .008, r = .012;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelThickness: .0012, bevelSize: .0012, bevelSegments: 3, curveSegments: 10 }); geo.translate(0, 0, -d / 2);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0b0f1a, metalness: .7, roughness: .32 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w - .006, h - .006), screenMat); screen.position.z = d / 2 + .0014;
  const glareMat = new THREE.ShaderMaterial({ vertexShader: VS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uK: { value: 0 } },
    fragmentShader: 'uniform float uK; varying vec2 vUv; void main(){ float band = smoothstep(0.0,0.35,1.0-abs((vUv.x*0.8+vUv.y)-0.9-uK)*2.2); gl_FragColor=vec4(vec3(1.0), band*0.10 + 0.02); }' });
  const glare = new THREE.Mesh(new THREE.PlaneGeometry(w - .006, h - .006), glareMat); glare.position.z = d / 2 + .0018;
  const bump = new THREE.Mesh(new THREE.BoxGeometry(.03, .03, .003), bodyMat); bump.position.set(-.016, .052, -d / 2 - .0014);
  const g = new THREE.Group(); g.add(new THREE.Mesh(geo, bodyMat)); g.add(screen); g.add(glare); g.add(bump);
  return { group: g, screenMat, glareMat, bodyMat };
}

export function Person3D(stage, geometry, inkUrls) {
  const canvas = document.createElement('canvas'); canvas.className = 'home-journey_gl';
  stage.prepend(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0); renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const PR = Math.min(window.devicePixelRatio || 1, 2); renderer.setPixelRatio(PR);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(30, 1, .02, 60);

  const blank = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); blank.needsUpdate = true;
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a1c55, roughness: .62, metalness: .02, side: THREE.FrontSide, vertexColors: true });
  const rimU = { uRim: { value: new THREE.Color() }, uMask: { value: blank }, uUseMask: { value: 0 }, uHead: { value: 0 }, uBreath: { value: 0 }, uTapR: { value: 0 }, uTapL: { value: 0 },
    uPN: { value: new THREE.Vector3(-.55, .84, 0).normalize() }, uFab: { value: 1 }, uRim2: { value: new THREE.Color() }, uRimDir: { value: new THREE.Vector3(-1, .5, 0) }, uRimDir2: { value: new THREE.Vector3(1, .2, 0) }, uCine: { value: 1 } };
  bodyMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, rimU);
    let vs = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vMUv; varying vec3 vObj; uniform float uHead, uBreath, uTapR, uTapL; uniform vec3 uPN;\nattribute vec4 aW;');
    vs = vs.replace('#include <begin_vertex>', `#include <begin_vertex>
vMUv = uv;
      { vec3 pv = vec3(0.0966,1.5743,-0.0000); vec3 r = transformed - pv; float a = uHead*aW.x; float c=cos(a), s=sin(a);
        transformed = mix(transformed, pv + vec3(c*r.x - s*r.y, s*r.x + c*r.y, r.z), step(0.0001, aW.x));
        transformed += normal * uBreath * aW.y;
        transformed += uPN * (uTapR*aW.z + uTapL*aW.w); }
vObj = transformed;`);
    sh.vertexShader = vs;
    sh.fragmentShader = 'uniform vec3 uRim, uRim2, uRimDir, uRimDir2; uniform float uCine; uniform sampler2D uMask; uniform float uUseMask, uFab; varying vec2 vMUv; varying vec3 vObj;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n#ifdef USE_COLOR\n { float mi = floor(vColor.g*3.0+0.5); roughnessFactor = mi < 0.5 ? 0.7 : mi < 1.5 ? 0.88 : mi < 2.5 ? 0.7 : 0.38; }\n#endif')
      .replace('#include <color_fragment>', '#ifdef USE_COLOR\n float matId = floor(vColor.g*3.0+0.5);\n diffuseColor.rgb *= vColor.r * (matId < 0.5 ? 1.1 : matId < 1.5 ? 1.0 : matId < 2.5 ? 0.5 : 0.4);\n#endif')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n if (uFab > 0.5 && abs(vColor.g*3.0-2.0) < 0.5) { float h1 = sin(vObj.y*1400.0 + vObj.x*600.0 + sin(vObj.z*300.0)*4.0)*0.55 + sin(vObj.z*2100.0 + vObj.y*500.0 + sin(vObj.x*700.0))*0.45; normal = normalize(normal + vec3(h1*0.22, h1*0.14, h1*0.22)); }\n if (uFab > 0.5 && abs(vColor.g*3.0-1.0) < 0.5) { float f1 = sin(vObj.y*420.0 + sin(vObj.z*90.0)*2.0)*0.5 + sin(vObj.x*510.0 + vObj.y*260.0)*0.35; normal = normalize(normal + vec3(f1*0.018, f1*0.024, f1*0.018)); }')
      .replace('#include <dithering_fragment>', 'if (uCine > 0.5) {\n   vec3 nv = normalize(normal); float ndv = clamp(abs(dot(nv, normalize(vViewPosition))),0.0,1.0);\n   float edge = pow(1.0 - ndv, 5.0) * smoothstep(0.02, 0.14, ndv) * 2.3; float halo = pow(1.0 - ndv, 2.5);\n   float s1 = smoothstep(-0.3, 0.35, dot(nv, uRimDir)); float s2 = smoothstep(-0.1, 0.5, dot(nv, uRimDir2));\n   float occ = 1.0;\n#ifdef USE_COLOR\n   occ = smoothstep(0.25, 0.85, vColor.r); gl_FragColor.rgb *= mix(0.25, 1.0, smoothstep(0.02, 0.35, vColor.r));\n#endif\n   gl_FragColor.rgb += (uRim * (edge * 3.4 * s1 + halo * 0.10 * s1) + uRim2 * edge * 1.3 * s2) * occ;\n }\n#include <dithering_fragment>');
  };
  const body = new THREE.Mesh(geometry, bodyMat);
  const figure = new THREE.Group(); figure.add(body); scene.add(figure);
  figure.rotation.y = 150 * deg;   // seen from behind his right shoulder, facing left (client reference)

  const P = makePhone(); figure.add(P.group);
  const phonePos = new THREE.Vector3(.33, 1.325, 0);
  let axisU = new THREE.Vector3(.84, .55, 0).normalize(), axisN = new THREE.Vector3(-.55, .84, 0).normalize();
  let axisX = new THREE.Vector3().crossVectors(axisU, axisN).normalize();
  P.group.position.copy(phonePos); P.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(axisX, axisU, axisN));
  figure.updateMatrixWorld(true);
  axisU = axisU.clone().applyQuaternion(figure.quaternion); axisN = axisN.clone().applyQuaternion(figure.quaternion); axisX = axisX.clone().applyQuaternion(figure.quaternion);
  const hisRight = new THREE.Vector3(0, 0, 1).applyQuaternion(figure.quaternion);
  const ui = ScreenUI(THREE, inkUrls.spring); P.screenMat.map = ui.tex; P.screenMat.needsUpdate = true;

  const hemi = new THREE.HemisphereLight(0xffffff, 0x080c1c, .05); scene.add(hemi);
  const rim = new THREE.DirectionalLight(0xffffff, .18); scene.add(rim); scene.add(rim.target);
  const rim2 = new THREE.DirectionalLight(0xffffff, .08); scene.add(rim2); scene.add(rim2.target);
  const key = new THREE.DirectionalLight(0xffffff, .03); scene.add(key); scene.add(key.target);
  const screenLight = new THREE.PointLight(0xffffff, 1.6, .75, 2); scene.add(screenLight);
  const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; bodyMat.envMapIntensity = .16; P.bodyMat.envMapIntensity = 1.2;

  const shadowMat = new THREE.ShaderMaterial({ vertexShader: VS, transparent: true, depthWrite: false, uniforms: { uCol: { value: new THREE.Color(0, 0, 0) }, uOp: { value: .45 } },
    fragmentShader: 'uniform vec3 uCol; uniform float uOp; varying vec2 vUv; void main(){ vec2 p=(vUv-0.5)*vec2(2.0,2.0); float d=length(p); float a=pow(clamp(1.0-d,0.0,1.0),1.6); gl_FragColor=vec4(uCol, a*uOp); }' });
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(.9, .55), shadowMat); contact.rotation.x = -Math.PI / 2; contact.position.set(.04, .003, 0); figure.add(contact);
  const glowMat = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, uniforms: { uCol: { value: new THREE.Color(1, 1, 1) }, uOp: { value: .5 }, uCore: { value: 0 } } });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(.9, .9), glowMat); scene.add(glow);

  const L = new THREE.TextureLoader(); L.setCrossOrigin('anonymous');
  const inkTex = SEASONS.map(s => { const t = L.load(inkUrls[s.ink]); t.minFilter = THREE.LinearMipmapLinearFilter; return t; });
  const inkMaterial = (op, seed, flip) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: INK_FS, transparent: true, depthWrite: false,
    uniforms: { t0: { value: inkTex[0] }, t1: { value: inkTex[1] }, t2: { value: inkTex[2] }, t3: { value: inkTex[3] }, uW: { value: new THREE.Vector4(1, 0, 0, 0) },
      uK: { value: new THREE.Vector4(SEASONS[0].k, SEASONS[1].k, SEASONS[2].k, SEASONS[3].k) }, uTime: { value: 0 }, uBias: { value: 0 }, uOp: { value: op }, uFlip: { value: flip }, uSeed: { value: new THREE.Vector2(seed, seed * 1.7) } } });
  const inks = [
    { m: new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6 / 1.96), inkMaterial(1.0, 0.0, 0)), p: new THREE.Vector3(.2, 1.1, -2.3), blur: [0, 2.6] },
    { m: new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.0 / 1.96), inkMaterial(.6, 2.1, 1)), p: new THREE.Vector3(.9, 1.4, -1.1), blur: [.6, 3] },
    { m: new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0 / 1.96), inkMaterial(.9, 3.7, 0)), p: new THREE.Vector3(1.9, .5, -1.6), blur: [1, 3.2] },
    { m: new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8 / 1.96), inkMaterial(.22, 4.3, 1)), p: new THREE.Vector3(1.2, .3, 1.3), blur: [3.4, 4] },
  ];
  inks.forEach((o, i) => { o.m.position.copy(o.p); o.m.renderOrder = i === 3 ? 10 : -5 + i; scene.add(o.m); });
  const N = 240, pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 4.4; pos[i * 3 + 1] = Math.random() * 2.6 - 1.3; pos[i * 3 + 2] = (Math.random() - .5) * 4; size[i] = .006 + Math.random() * .02; seed[i] = Math.random(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); pg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const ptMat = new THREE.ShaderMaterial({ vertexShader: PT_VS, fragmentShader: PT_FS, transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uPR: { value: PR }, uH: { value: 800 }, uCol: { value: new THREE.Color() }, uOp: { value: .75 } } });
  const pts = new THREE.Points(pg, ptMat); pts.position.set(.3, 1.1, 0); scene.add(pts);

  const st = { W: 1, H: 1, mouse: { x: 0, y: 0 }, target: { x: 0, y: 0 }, cx: .66, figFrac: .92, T: { x: 0, y: 0 }, closeFov: 20, sway: 0, azOff: 0 };
  const onMove = e => { const r = stage.getBoundingClientRect(); st.target.x = clamp(((e.clientX - r.left) / r.width - .5) * 2, -1, 1); st.target.y = clamp(((e.clientY - r.top) / r.height - .5) * 2, -1, 1); };
  const onLeave = () => { st.target.x = 0; st.target.y = 0; };
  stage.addEventListener('pointermove', onMove); stage.addEventListener('pointerleave', onLeave);
  const tmp = new THREE.Vector3(), camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), up = new THREE.Vector3();
  const FIG_CX = 0.02, FIG_H = 1.8;

  return {
    canvas,
    dispose() { stage.removeEventListener('pointermove', onMove); stage.removeEventListener('pointerleave', onLeave); renderer.dispose(); canvas.remove(); },
    layout(W, H, o) { st.W = W; st.H = H; Object.assign(st, o); renderer.setSize(W, H, false); ptMat.uniforms.uH.value = H; },
    update(t, s, v, z, sceneI, sp) {
      const m = st.mouse, auto = REDUCE ? 0 : Math.sin(t * .21);
      m.x = lerp(m.x, st.target.x, .05); m.y = lerp(m.y, st.target.y, .05);
      figure.position.y = REDUCE ? 0 : Math.sin(t * 1.1) * .0015;
      rimU.uHead.value = REDUCE ? 0 : Math.sin(t * .5) * .018 + Math.sin(t * 1.7) * .004;
      rimU.uBreath.value = REDUCE ? 0 : (Math.sin(t * 1.1) * .5 + .5) * .0045;
      const typing = !REDUCE && (sceneI === 1 || sceneI === 4) && z > .6;
      const tap = k => Math.max(0, Math.sin(t * 11 + k)) ** 6 * .005;
      rimU.uTapR.value = typing ? tap(0) : 0; rimU.uTapL.value = typing ? tap(2.2) : 0;
      P.glareMat.uniforms.uK.value = (camPos.x - camTgt.x) * .6 + (camPos.z - camTgt.z) * .3;
      shadowMat.uniforms.uCol.value.copy(lin(mix(s.fig, [0, 0, 0], .5)));
      bodyMat.color.copy(lin(mix(s.fig, [3, 4, 10], .88)));
      rimU.uRim.value.copy(lin(mix(s.glow, [255, 255, 255], .2))).multiplyScalar(.9);
      rimU.uRim2.value.copy(lin(mix(s.glow, [255, 255, 255], .35))).multiplyScalar(.4);
      hemi.color.copy(lin(mix(s.glow, [255, 255, 255], .3))); hemi.groundColor.copy(lin(mix(s.fig, [0, 0, 0], .4)));
      rim.color.copy(lin(s.glow)); rim2.color.copy(lin(mix(s.glow, [255, 255, 255], .25)));
      const pulse = REDUCE ? .5 : .5 + .5 * Math.sin(t * 1.7);
      screenLight.color.copy(lin(mix(s.glow, [255, 255, 255], .2))); screenLight.intensity = 1.6 + .5 * pulse;
      screenLight.position.copy(P.group.localToWorld(tmp.set(0, 0, .08)));
      glow.position.copy(P.group.localToWorld(tmp.set(0, 0, -.04))); glow.position.add(tmp.copy(camTgt).sub(camPos).normalize().multiplyScalar(.45)); glow.quaternion.copy(cam.quaternion);
      glowMat.uniforms.uCol.value.copy(lin(s.glow)); glowMat.uniforms.uOp.value = .35 + .2 * pulse;
      ptMat.uniforms.uCol.value.copy(lin(mix(s.acc, s.glow, .45))); ptMat.uniforms.uTime.value = REDUCE ? 0 : t;
      const w = weights(v);
      inks.forEach(o => { const u = o.m.material.uniforms; u.uW.value.set(w[0], w[1], w[2], w[3]); u.uTime.value = REDUCE ? 0 : t; u.uBias.value = lerp(o.blur[0], o.blur[1], z); o.m.quaternion.copy(cam.quaternion); });
      ui.draw(sceneI, sp, s);
      // camera: wide reference view -> in to the phone, rolling so the screen reads upright
      const e = z * z * (3 - 2 * z);
      const visH = FIG_H / st.figFrac, fovW = 30, distW = (visH / 2) / Math.tan(fovW * deg / 2);
      const az = (st.sway * .5 * auto + m.x * 12 + 16 + st.azOff) * deg * (1 - e), el = (4 - m.y * 4) * deg * (1 - e);
      const wideT = new THREE.Vector3(FIG_CX, visH / 2 - .02, 0);
      const wideP = wideT.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(distW));
      const phoneC = P.group.getWorldPosition(new THREE.Vector3());
      const closeDir = axisN.clone().multiplyScalar(.5).add(new THREE.Vector3(0, .35, 0)).add(hisRight.clone().multiplyScalar(.8 + m.x * .1)).normalize();
      const closeP = phoneC.clone().add(closeDir.multiplyScalar(.78));
      camPos.lerpVectors(wideP, closeP, e);
      camPos.add(hisRight.clone().multiplyScalar(Math.sin(e * Math.PI) * .35)).add(new THREE.Vector3(0, Math.sin(e * Math.PI) * .15, 0));
      camTgt.lerpVectors(wideT, phoneC, e);
      up.set(0, 1, 0).lerp(axisU, e).normalize(); cam.up.copy(up);
      cam.position.copy(camPos); cam.lookAt(camTgt);
      cam.updateMatrixWorld();
      const fw = camTgt.clone().sub(camPos).normalize(), rt = new THREE.Vector3().crossVectors(fw, cam.up).normalize(), uv = new THREE.Vector3().crossVectors(rt, fw);
      rim.position.copy(camTgt).addScaledVector(fw, 3.0).addScaledVector(rt, -1.25).addScaledVector(uv, .9); rim.target.position.copy(camTgt); rim.target.updateMatrixWorld();
      rim2.position.copy(camTgt).addScaledVector(fw, 3.0).addScaledVector(rt, 1.4).addScaledVector(uv, .4); rim2.target.position.copy(camTgt); rim2.target.updateMatrixWorld();
      key.position.copy(camTgt).addScaledVector(fw, -2).addScaledVector(rt, .6).addScaledVector(uv, 1.2); key.target.position.copy(camTgt); key.target.updateMatrixWorld();
      rimU.uRimDir.value.copy(rim.position).sub(camTgt).normalize().transformDirection(cam.matrixWorldInverse);
      rimU.uRimDir2.value.copy(rim2.position).sub(camTgt).normalize().transformDirection(cam.matrixWorldInverse);
      cam.fov = lerp(fovW, st.closeFov, e);
      const Sx = lerp(st.cx * st.W, st.T.x, e), Sy = lerp(st.H * .5, st.T.y, e);
      cam.aspect = st.W / st.H; cam.setViewOffset(st.W, st.H, st.W / 2 - Sx, st.H / 2 - Sy, st.W, st.H); cam.updateProjectionMatrix();
      renderer.render(scene, cam);
    },
    phoneRect() {
      const pts = [[-.0385, -.08], [.0385, -.08], [.0385, .08], [-.0385, .08]].map(([x, y]) => { P.group.localToWorld(tmp.set(x, y, 0)).project(cam); return { x: (tmp.x * .5 + .5) * st.W, y: (-tmp.y * .5 + .5) * st.H }; });
      const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
      return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
  };
}
