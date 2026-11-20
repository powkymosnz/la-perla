import * as THREE from '../vendor/three.module.min.js';
import { createRandom } from './random.js';
import { texture } from './geometry.js';

function horizonMap() {
  return texture(1536, 128, ctx => {
    const random = createRandom(927);
    for (const [color, scale, base] of [['#bd8e91', .68, 111], ['#9b7785', 1, 124]]) {
      ctx.fillStyle = color;
      for (let x = 0; x < 1536;) {
        const width = 3 + Math.floor(random() * 9);
        const block = .22 + .78 * Math.pow(Math.max(0, Math.sin(x * .021) * Math.cos(x * .005)), .38);
        const height = Math.round((7 + random() ** 2 * 65) * scale * block);
        ctx.fillRect(x, base - height, width, height + 128 - base);
        if (height > 22 && random() > .5) {
          ctx.fillRect(x + 2, base - height - 3, width - 3, 4);
          if (height > 38) ctx.fillRect(x + 3, base - height - 10, 1, 8);
        }
        x += width + 1 + Math.floor(random() * 6);
      }
    }
  });
}

export function createRender() {
  const scene = new THREE.Scene();
  const sunDirection = new THREE.Vector3(.8, .115, .68).normalize();
  scene.fog = new THREE.FogExp2(0xe6a9a4, .0040);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const software = info && /swiftshader|llvmpipe/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  // Share software-renderer constraints with the bounded ambient instance pools.
  scene.userData.software = Boolean(software);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, software ? .72 : 1));
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  document.body.prepend(renderer.domElement);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(1450, 32, 18), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      sun: { value: sunDirection },
      horizon: { value: new THREE.Color(0xffb59c) },
      high: { value: new THREE.Color(0x688ab5) },
      skyline: { value: horizonMap() },
      night: { value: 0 }, rain: { value: 0 },
    },
    vertexShader: `
      varying vec3 direction;
      void main() {
        direction = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position.z = gl_Position.w * 0.9999;
      }`,
    fragmentShader: `
      varying vec3 direction;
      uniform vec3 sun, horizon, high;
      uniform float night, rain;
      uniform sampler2D skyline;
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
                   mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
      }
      float clouds(vec2 p) {
        return noise(p) * .55 + noise(p * 2.07 + 2.1) * .26 + noise(p * 4.19 - 3.5) * .13 + noise(p * 8.33 + 1.4) * .06;
      }
      void main() {
        vec3 dir = normalize(direction);
        float towardSun = max(dot(dir, sun), 0.0);
        vec3 color = mix(horizon, high, smoothstep(-0.02, 0.50, dir.y));
        color += (1.0 - night) * (1.0 - rain * .94) * vec3(0.45, 0.14, 0.025) * pow(towardSun, 16.0);
        color += (1.0 - night) * (1.0 - rain * .94) * vec3(0.7, 0.32, 0.095) * pow(towardSun, 240.0);
        color += (1.0 - night) * (1.0 - rain * .94) * vec3(2.0, 1.45, 0.76) * smoothstep(0.99945, 0.9996, towardSun);
        if (dir.y > 0.025) {
          vec2 p = dir.xz / (0.29 + dir.y) * 3.9;
          float density = clouds(p * vec2(1.0, 1.55) + 2.6);
          float veil = smoothstep(.48, .65, density) * smoothstep(.035, .15, dir.y);
          vec3 cloud = mix(vec3(.49, .31, .42), vec3(1.13, .73, .55),
                           smoothstep(.53, .72, density + .10 * towardSun));
          cloud = mix(cloud, mix(vec3(.19, .24, .31), vec3(.035, .055, .10), night), max(night, rain));
          veil = mix(veil, .80 + density * .20, rain);
          color = mix(color, cloud, veil * .82 * (1.0 - smoothstep(.9992, .9996, towardSun)));
        }
        float band = dir.y + .006;
        if (band > 0.0 && band < .134) {
          float azimuth = atan(dir.z, dir.x) / 6.2831853 + .5;
          vec4 buildings = texture2D(skyline, vec2(azimuth, band / .134));
          color = mix(color, buildings.rgb * mix(1.0, .09, night), buildings.a * .62);
        }
        if (night > .5 && rain < .5 && dir.y > .08) {
          vec2 starUV = vec2(atan(dir.z, dir.x) * 125.0, asin(dir.y) * 125.0);
          float star = step(.982, hash(floor(starUV))) * pow(max(0.0, 1.0 - length(fract(starUV) - .5) * 2.0), 5.0);
          color += vec3(.8, .88, 1.0) * star * 3.0;
          float moon = smoothstep(.99960, .99972, dot(dir, normalize(vec3(-.4, .5, .65))));
          color += vec3(.65, .78, 1.0) * moon;
        }
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  const hemi = new THREE.HemisphereLight(0xf4e3e3, 0xaaa0ba, 1.85);
  scene.add(sky, hemi);
  const sun = new THREE.DirectionalLight(0xffba79, 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -95, right: 95, top: 95, bottom: -95, near: 5, far: 450 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias = .18;
  sun.shadow.bias = -.0003;
  scene.add(sun, sun.target);

  function resize(camera) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Fog covers the horizon while software rendering culls distant city batches.
    // A tighter software-only distance cuts command submission cost in the measured dense boulevard.
    camera.far = software ? 220 : 1050;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function draw(camera, focus) {
    sky.position.copy(camera.position);
    sun.target.position.copy(focus);
    sun.position.copy(focus).addScaledVector(sunDirection, 210);
    renderer.render(scene, camera);
  }

  return { scene, renderer, software, resize, draw, sky, hemi, sun, sunDirection };
}
