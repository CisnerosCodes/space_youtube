// ---------- 10_clay.js: clay material (lumps, fingerprints, boil, soft rim) and helpers ----------
const CLAY = (() => {
  const G = {
    uBoilSeed: { value: 0 },      // changes every pose frame (on twos)
    uFar: { value: 600 },         // depth normalisation for the DOF pass (alpha channel, log encoded)
    uEnc: { value: 1 },           // 1 while rendering into the 8-bit lens buffer (gamma-encoded colour, range 0..2)
    uPrintTex: { value: null },   // fingerprint / tool-mark height map (tileable)
  };

  // ---- the fingerprint height texture, drawn once with a seeded PRNG ----
  function makePrintTexture(size = 1024) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const R = U.mulberry32(4242);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, size, size);
    const wrapDraw = (fn) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { g.save(); g.translate(dx, dy); fn(); g.restore(); } };
    // soft broad thumb pushes (low frequency dents)
    for (let i = 0; i < 70; i++) {
      const x = R() * size, y = R() * size, r = 40 + R() * 120, d = R() < 0.5 ? -1 : 1;
      wrapDraw(() => {
        const gr = g.createRadialGradient(x, y, 0, x, y, r);
        const c = d > 0 ? '160,160,160' : '96,96,96';
        gr.addColorStop(0, `rgba(${c},0.22)`); gr.addColorStop(1, `rgba(${c},0)`);
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      });
    }
    // fingerprints: concentric wobbly ellipses (whorls and loops), faded at the edge
    for (let i = 0; i < 26; i++) {
      const x = R() * size, y = R() * size, rx = 55 + R() * 55, ry = rx * (1.25 + R() * 0.35), rot = R() * Math.PI;
      const spacing = 5.2 + R() * 1.6, loop = R() < 0.45, ph = R() * 10;
      wrapDraw(() => {
        g.save(); g.translate(x, y); g.rotate(rot);
        for (let k = 1; k * spacing < rx; k++) {
          const s = k * spacing, a = 0.5 * Math.pow(1 - s / rx, 0.6);
          g.strokeStyle = `rgba(${R() < 0.5 ? '70,70,70' : '186,186,186'},${a.toFixed(3)})`;
          g.lineWidth = 1.6 + R() * 0.8;
          g.beginPath();
          const steps = 64;
          for (let j = 0; j <= steps; j++) {
            const th = (j / steps) * Math.PI * 2 * (loop ? 0.82 : 1) + (loop ? 0.55 : 0);
            const wob = 1 + 0.04 * Math.sin(th * 3 + ph + k * 0.7) + 0.02 * Math.sin(th * 7 + k);
            const px = Math.cos(th) * s * (rx / ry) * wob * 1.0, py = Math.sin(th) * s * wob;
            j ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.stroke();
        }
        g.restore();
      });
    }
    // sculpting tool strokes
    for (let i = 0; i < 40; i++) {
      const x = R() * size, y = R() * size, len = 30 + R() * 90, ang = R() * Math.PI;
      wrapDraw(() => {
        g.strokeStyle = `rgba(${R() < 0.5 ? '90,90,90' : '170,170,170'},${(0.15 + R() * 0.25).toFixed(2)})`;
        g.lineWidth = 1 + R() * 2.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y);
        g.quadraticCurveTo(x + Math.cos(ang) * len * 0.5 + (R() - 0.5) * 20, y + Math.sin(ang) * len * 0.5 + (R() - 0.5) * 20, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        g.stroke();
      });
    }
    // pores and specks
    for (let i = 0; i < 2200; i++) {
      const x = R() * size, y = R() * size, r = 0.6 + R() * 1.6;
      g.fillStyle = `rgba(${R() < 0.6 ? '60,60,60' : '200,200,200'},${(0.25 + R() * 0.4).toFixed(2)})`;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // a light blur so ridges are soft
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = size;
    const g2 = cv2.getContext('2d'); g2.filter = 'blur(0.7px)'; g2.drawImage(cv, 0, 0);
    const tex = new THREE.CanvasTexture(cv2);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    return tex;
  }

  const NOISE_GLSL = `
  float hash13(vec3 p){ p = fract(p*0.1031); p += dot(p, p.zyx+31.32); return fract((p.x+p.y)*p.z); }
  float vnoise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x), mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
               mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x), mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y), f.z); }
  `;

  // opts: color, rough, print (cm of ridge height), printScale (1/cm), boil (cm), rim, depth(bool), map, vcol, emissive, spec
  function mat(color, o = {}) {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color), roughness: o.rough ?? 0.78, metalness: o.metal ?? 0,
      map: o.map || null, vertexColors: !!o.vcol, side: o.side ?? THREE.FrontSide,
      emissive: new THREE.Color(o.emissive || 0x000000), emissiveIntensity: o.emissiveIntensity ?? 1,
      transparent: !!o.transparent, opacity: o.opacity ?? 1, flatShading: !!o.flat,
    });
    if (o.transparent) {
      // keep the depth (alpha) written by opaque surfaces behind
      m.blending = THREE.CustomBlending;
      m.blendSrc = THREE.SrcAlphaFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
      m.blendSrcAlpha = THREE.ZeroFactor; m.blendDstAlpha = THREE.OneFactor;
      m.depthWrite = o.depthWrite ?? false;
    }
    const L = {
      uPrint: { value: o.print ?? 0.012 },
      uPrintScale: { value: o.printScale ?? 0.16 },
      uBoil: { value: o.boil ?? 0 },
      uBoilPrint: { value: o.boilPrint ?? 0 },
      uRim: { value: o.rim ?? 0.22 },
      uSeed: { value: o.seed ?? 0.37 },
      uWriteDepth: { value: o.transparent ? 0 : (o.depth === false ? 0 : 1) },
      uSheen: { value: o.sheen ?? 0.05 },
    };
    m.userData.L = L;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, G, L);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uBoil; uniform float uBoilSeed; uniform float uSeed;
          varying vec3 vObjPos; varying vec3 vObjN;
          ${NOISE_GLSL}`)
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vObjPos = position; vObjN = normal;
          if (uBoil > 0.0) { float bn = vnoise(position*2.7 + vec3(uBoilSeed*7.13 + uSeed*31.0)) - 0.5; transformed += normal * bn * uBoil; }`);
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform sampler2D uPrintTex; uniform float uPrint; uniform float uPrintScale; uniform float uRim; uniform float uFar;
          uniform float uWriteDepth; uniform float uEnc; uniform float uBoilSeed; uniform float uBoilPrint; uniform float uSeed; uniform float uSheen;
          varying vec3 vObjPos; varying vec3 vObjN;
          float clayH(vec3 p, vec3 n){
            vec3 w = pow(abs(normalize(n)), vec3(4.0)); w /= (w.x+w.y+w.z+1e-5);
            vec2 off = vec2(uSeed*0.613, uSeed*0.271) + uBoilPrint*vec2(fract(uBoilSeed*0.618), fract(uBoilSeed*0.414));
            vec3 q = p*uPrintScale;
            float h = texture2D(uPrintTex, q.yz+off).r*w.x + texture2D(uPrintTex, q.zx+off.yx).r*w.y + texture2D(uPrintTex, q.xy+off*1.3).r*w.z;
            return (h-0.5)*uPrint;
          }
          vec3 perturbClay(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
            vec3 vSigmaX = dFdx(surf_pos); vec3 vSigmaY = dFdy(surf_pos); vec3 vN = surf_norm;
            vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX);
            float fDet = dot(vSigmaX, R1) * faceDir;
            vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
            return normalize(abs(fDet) * surf_norm - vGrad);
          }`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          if (uPrint > 0.0) { float hh = clayH(vObjPos, vObjN); normal = perturbClay(-vViewPosition, normal, vec2(dFdx(hh), dFdy(hh)), faceDirection); }`)
        .replace('#include <opaque_fragment>', `
          { float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
            outgoingLight += diffuseColor.rgb * (uRim * pow(fr, 2.2) * 0.6 + uSheen); }
          #include <opaque_fragment>`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>
          if (uEnc > 0.5) {
            gl_FragColor.rgb = pow(clamp(gl_FragColor.rgb*0.5, 0.0, 1.0), vec3(0.4545));
            if (uWriteDepth > 0.5) gl_FragColor.a = clamp(log(max(vViewPosition.z, 1.0))/log(uFar), 0.0, 1.0);
          }`);
    };
    m.customProgramCacheKey = () => 'clay' + (o.transparent ? 't' : 'o');
    return m;
  }

  // ---- geometry helpers ----
  // smooth normals that ignore UV seams (vertices at the same position share a normal)
  function smoothNormals(geo) {
    geo.computeVertexNormals();
    const p = geo.attributes.position, n = geo.attributes.normal, map = new Map();
    for (let i = 0; i < p.count; i++) {
      const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
      const e = map.get(k);
      if (e) { e.push(i); } else map.set(k, [i]);
    }
    for (const ids of map.values()) {
      if (ids.length < 2) continue;
      let x = 0, y = 0, z = 0;
      for (const i of ids) { x += n.getX(i); y += n.getY(i); z += n.getZ(i); }
      const l = Math.hypot(x, y, z) || 1;
      for (const i of ids) n.setXYZ(i, x / l, y / l, z / l);
    }
    n.needsUpdate = true;
    return geo;
  }
  // displace along normals with smooth noise (hand-made lumps)
  function lump(geo, amp = 0.05, freq = 0.8, seed = 0, oct = 2) {
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const tmpN = geo.attributes.normal.clone();
    smoothNormals(geo);
    const p = geo.attributes.position, n = geo.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const d = amp * U.fbm3(x * freq + seed * 13.1, y * freq + seed * 7.7, z * freq + seed * 3.3, oct);
      p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
    }
    p.needsUpdate = true;
    smoothNormals(geo);
    return geo;
  }
  return { G, makePrintTexture, mat, lump, smoothNormals };
})();
