// ---------- 60_post.js: lens passes ----------
// The scene renders into an 8-bit MSAA buffer: rgb = gamma-encoded colour (range 0..2), a = log depth.
// A: half-res prep (linear colour + depth), B: half-res bokeh gather (or whip blur),
// C: full-res composite (sharp where in focus) + grade, flicker, vignette, grain.
const POST = (() => {
  let rt, rtA, rtB, qScene, qCam, quad, mA, mB, mC;
  const COMMON = `
    uniform float uFocus, uFar, uAperture, uMaxBlur;
    vec3 dec(vec3 c){ return pow(c, vec3(2.2))*2.0; }
    float depthOf(float a){ return pow(uFar, a); }
    float cocOf(float a){ float d = depthOf(a); return clamp(uAperture*abs(1.0 - uFocus/d), 0.0, uMaxBlur); }
    float h12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
  `;
  const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
  function init(renderer, W, H) {
    rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, samples: 4, depthBuffer: true });
    const half = { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, generateMipmaps: false };
    rtA = new THREE.WebGLRenderTarget(W / 2, H / 2, half);
    rtB = new THREE.WebGLRenderTarget(W / 2, H / 2, half);
    const lens = { uFocus: { value: 40 }, uFar: CLAY.G.uFar, uAperture: { value: 18 }, uMaxBlur: { value: 22 } };
    mA = new THREE.ShaderMaterial({
      uniforms: { tColor: { value: rt.texture }, uRes: { value: new THREE.Vector2(W, H) }, ...lens },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tColor; uniform vec2 uRes; varying vec2 vUv; ${COMMON}
        void main(){
          vec2 px = 1.0/uRes;
          vec4 a = texture2D(tColor, vUv + vec2(-0.5,-0.5)*px), b = texture2D(tColor, vUv + vec2(0.5,-0.5)*px);
          vec4 c = texture2D(tColor, vUv + vec2(-0.5,0.5)*px), d = texture2D(tColor, vUv + vec2(0.5,0.5)*px);
          vec3 col = (dec(a.rgb)+dec(b.rgb)+dec(c.rgb)+dec(d.rgb))*0.25;
          float z = min(min(a.a,b.a),min(c.a,d.a));
          gl_FragColor = vec4(col, z);
        }`,
    });
    mB = new THREE.ShaderMaterial({
      uniforms: { tA: { value: rtA.texture }, uRes: { value: new THREE.Vector2(W / 2, H / 2) }, uWhip: { value: new THREE.Vector2() }, uSeed: { value: 0 }, uTaps: { value: 40 }, ...lens },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tA; uniform vec2 uRes; uniform vec2 uWhip; uniform float uSeed; uniform int uTaps; varying vec2 vUv; ${COMMON}
        void main(){
          vec2 px = 1.0/uRes;
          vec4 c0 = texture2D(tA, vUv);
          float wl = length(uWhip);
          if (wl > 0.75) {
            vec3 acc = vec3(0.0);
            for (int i = 0; i < 20; i++) { float f = (float(i)+h12(gl_FragCoord.xy+uSeed))/20.0 - 0.5; acc += texture2D(tA, vUv + uWhip*0.5*px*f).rgb; }
            gl_FragColor = vec4(acc/20.0, 99.0);
            return;
          }
          float cc = cocOf(c0.a)*0.5;            // half-res pixels
          float maxR = uMaxBlur*0.5;
          vec3 acc = c0.rgb; float tot = 1.0; float cmax = cc;
          float rot = h12(gl_FragCoord.xy + uSeed*13.0)*6.2831;
          for (int i = 1; i < 64; i++) {
            if (i >= uTaps) break;
            float fi = float(i);
            float r = maxR*sqrt(fi/float(uTaps));
            float an = fi*2.39996 + rot;
            vec4 s = texture2D(tA, vUv + vec2(cos(an), sin(an))*r*px);
            float sc = cocOf(s.a)*0.5;
            if (s.a > c0.a) sc = min(sc, cc*2.0);
            float m = smoothstep(r-1.0, r+1.0, sc);
            acc += mix(acc/tot, s.rgb, m); tot += 1.0;
            cmax = max(cmax, sc*m);
          }
          gl_FragColor = vec4(acc/tot, cmax*2.0);
        }`,
    });
    mC = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: rt.texture }, tB: { value: rtB.texture }, uRes: { value: new THREE.Vector2(W, H) }, ...lens,
        uExposure: { value: 1 }, uGrain: { value: 0.03 }, uSeed: { value: 0 }, uVignette: { value: 0.32 },
        uScrim: { value: new THREE.Vector4(0, 0, 1, 1) }, uScrimA: { value: 0 }, uWarm: { value: 1 }, uFade: { value: 0 }, uSat: { value: 1.12 },
      },
      vertexShader: VS, depthTest: false, depthWrite: false,
      fragmentShader: `uniform sampler2D tColor, tB; uniform vec2 uRes; uniform float uExposure, uGrain, uSeed, uVignette, uScrimA, uWarm, uFade, uSat; uniform vec4 uScrim; varying vec2 vUv; ${COMMON}
        void main(){
          vec4 c0 = texture2D(tColor, vUv);
          vec3 sharp = dec(c0.rgb);
          vec4 b = texture2D(tB, vUv);
          float cc = cocOf(c0.a);
          float m = b.a > 98.0 ? 1.0 : max(smoothstep(0.7, 2.6, cc), smoothstep(1.2, 3.5, b.a) * step(cc, b.a));
          vec3 col = mix(sharp, b.rgb, m);
          col *= uExposure;
          float l = dot(col, vec3(0.2126,0.7152,0.0722));
          col = mix(vec3(l), col, uSat);
          col *= mix(vec3(0.93,0.97,1.07), vec3(1.05,1.0,0.93), smoothstep(0.0, 0.6, l)*uWarm + (1.0-uWarm)*0.5);
          if (uScrimA > 0.0) { vec2 q = (vUv*uRes - uScrim.xy)/uScrim.zw; col *= 1.0 - uScrimA*(1.0 - smoothstep(0.5, 1.0, length(q))); }
          vec2 vq = vUv - 0.5; vq.x *= 0.85;
          col *= 1.0 - uVignette*smoothstep(0.25, 0.78, length(vq));
          gl_FragColor = vec4(max(col, 0.0), 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          gl_FragColor.rgb += (h12(gl_FragCoord.xy*1.37 + uSeed*91.7) - 0.5)*uGrain;
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.043,0.043,0.047), uFade);
        }`,
    });
    mC.toneMapped = true;
    qScene = new THREE.Scene();
    qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mA);
    quad.frustumCulled = false;
    qScene.add(quad);
    POST.lens = lens;
  }
  function render(renderer, scene, camera) {
    CLAY.G.uEnc.value = 1;
    renderer.setRenderTarget(rt);
    renderer.setClearColor(0x000000, 1);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);
    CLAY.G.uEnc.value = 0;
    quad.material = mA; renderer.setRenderTarget(rtA); renderer.render(qScene, qCam);
    quad.material = mB; renderer.setRenderTarget(rtB); renderer.render(qScene, qCam);
    quad.material = mC; renderer.setRenderTarget(null); renderer.render(qScene, qCam);
  }
  const P = { init, render, get A() { return mA.uniforms; }, get B() { return mB.uniforms; }, get C() { return mC.uniforms; }, lens: null };
  return P;
})();
