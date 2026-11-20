import * as THREE from '../vendor/three.module.min.js';
import { createRandom } from './random.js';

// Independent axes: all three times support both weather states in ordinary play.
export const TIMES = Object.freeze({
  noon: Object.freeze({ label: 'MIDDAY', clock: '13:10', high: 0x267bd4, horizon: 0xa3d6ed, fog: 0xa9ccdc, key: 0xfff4da, fill: 0xc4ddff, ground: 0x838c9f, intensity: 3.1, ambient: 1.6, sun: [.28, .92, .2] }),
  golden: Object.freeze({ label: 'GOLDEN HOUR', clock: '18:45', high: 0x688ab5, horizon: 0xffb59c, fog: 0xe6a9a4, key: 0xffba79, fill: 0xf4e3e3, ground: 0xaaa0ba, intensity: 2.6, ambient: 1.85, sun: [.8, .115, .68] }),
  night: Object.freeze({ label: 'NIGHT', clock: '23:40', high: 0x030a20, horizon: 0x152541, fog: 0x111d34, key: 0x95b7ff, fill: 0x8fa9e1, ground: 0x3e4867, intensity: .65, ambient: .85, sun: [-.4, .5, .65] }),
});
export const WEATHER = Object.freeze(['clear', 'rain']);
export function testConditions(search) {
  const params = new URLSearchParams(search);
  return { time: params.has('test') && Object.hasOwn(TIMES, params.get('time')) ? params.get('time') : 'golden',
    weather: params.has('test') && WEATHER.includes(params.get('weather')) ? params.get('weather') : 'clear' };
}

// Soft radial projected light. Data pixels keep this procedural and usable without a canvas.
function glowTexture() {
  const pixels = new Uint8Array(64 * 64 * 4);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const radius = Math.hypot((x - 31.5) / 32, (y - 31.5) / 32);
    pixels.set([255, 255, 255, Math.round(255 * Math.max(0, 1 - radius * radius) ** 2)], (y * 64 + x) * 4);
  }
  const map = new THREE.DataTexture(pixels, 64, 64);
  map.magFilter = map.minFilter = THREE.LinearFilter; map.needsUpdate = true;
  return map;
}

export function createEnvironment(scene, rig, car) {
  const random = createRandom(903), lighting = scene.userData.cityLighting;
  const glow = glowTexture(), matrix = new THREE.Object3D();
  const poolGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const cityLights = new THREE.InstancedMesh(poolGeometry, new THREE.MeshBasicMaterial({
    color: 0xffc883, map: glow, transparent: true, opacity: .36, depthWrite: false,
    blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2,
  }), lighting.lamps.length);
  lighting.lamps.forEach(([x, z], i) => {
    matrix.position.set(x, .035, z); matrix.scale.set(11, 1, 17); matrix.updateMatrix();
    cityLights.setMatrixAt(i, matrix.matrix);
  });
  cityLights.computeBoundingSphere(); cityLights.name = 'streetlight-pools'; scene.add(cityLights);

  const headlights = new THREE.Group(); headlights.name = 'headlight-beams'; car.root.add(headlights);
  for (const side of [-1, 1]) {
    const lamp = new THREE.SpotLight(0xffe2a4, 65, 34, .43, .65, 1.2);
    lamp.position.set(side * .65, .8, 2.3); lamp.target.position.set(side * .9, .05, 22);
    headlights.add(lamp, lamp.target);
    const pool = new THREE.Mesh(poolGeometry, new THREE.MeshBasicMaterial({ color: 0xffe3ac,
      map: glow, transparent: true, opacity: .5, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.position.set(side * 1.2, .042, 10); pool.scale.set(6, 1, 18); headlights.add(pool);
  }

  // Bounded, camera-local line segments: no per-drop objects, lights, or allocations each frame.
  const count = scene.userData.software ? 1000 : 1800;
  const drops = new Float32Array(count * 6), seeds = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    seeds.set([(random() - .5) * 76, random() * 31, (random() - .5) * 76], i * 3);
  }
  const rainGeometry = new THREE.BufferGeometry();
  rainGeometry.setAttribute('position', new THREE.BufferAttribute(drops, 3).setUsage(THREE.DynamicDrawUsage));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: 0xc0ddf2,
    transparent: true, opacity: .56, depthWrite: false }));
  rain.frustumCulled = false; rain.name = 'falling-rain'; scene.add(rain);
  const splashCount = 100;
  const splashes = new THREE.InstancedMesh(new THREE.RingGeometry(.7, 1, 10).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xb9d7e2, transparent: true, opacity: .24, depthWrite: false, side: THREE.DoubleSide }), splashCount);
  splashes.frustumCulled = false; scene.add(splashes);

  // Cheap city/sky reflection: one tiled road shader, rather than a second scene render.
  // Broken vertical glints stand in for reflected windows, neon and the overcast sky.
  const wetRoad = new THREE.Mesh(new THREE.PlaneGeometry(1220, 1220), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { night: { value: 0 }, clock: { value: 0 } },
    vertexShader: `varying vec3 world; void main(){vec4 p=modelMatrix*vec4(position,1.);world=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,
    fragmentShader: `varying vec3 world; uniform float night,clock;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){
        vec2 grid=abs(mod(world.xz+50.,100.)-50.);
        if(min(grid.x,grid.y)>9.6) discard;
        float curb=min(grid.x,grid.y);
        vec2 p=grid.x<grid.y?world.xz:world.zx;
        float ripple=sin(p.y*7.+sin(p.x*19.)+clock*9.)*.07;
        float strip=pow(max(0.,1.-abs(sin(p.x*1.7+ripple))),14.);
        float broken=.25+.75*hash(floor(p*vec2(3.,.7)));
        float glint=strip*broken*smoothstep(0.,6.,curb)*.55;
        vec3 reflection=mix(vec3(.36,.52,.65),mix(vec3(.1,.25,.44),vec3(.98,.55,.22),hash(floor(p.yy*.13))),night);
        gl_FragColor=vec4(reflection,.10+glint);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  wetRoad.rotation.x = -Math.PI / 2; wetRoad.position.y = .018; wetRoad.name = 'wet-road-reflections'; scene.add(wetRoad);
  let condition, elapsed = 0;
  function set(time, weather) {
    if (!Object.hasOwn(TIMES, time) || !WEATHER.includes(weather)) throw new RangeError('Unknown time/weather');
    const preset = TIMES[time], night = time === 'night', wet = weather === 'rain';
    const uniforms = rig.sky.material.uniforms;
    uniforms.high.value.setHex(preset.high); uniforms.horizon.value.setHex(preset.horizon);
    if (wet) {
      uniforms.high.value.lerp(new THREE.Color(night ? 0x0b1223 : 0x425568), .82);
      uniforms.horizon.value.lerp(new THREE.Color(night ? 0x1c293f : 0x87969f), .88);
    }
    uniforms.night.value = night ? 1 : 0; uniforms.rain.value = wet ? 1 : 0;
    rig.sunDirection.set(...preset.sun).normalize();
    rig.sun.color.setHex(preset.key); rig.sun.intensity = preset.intensity * (wet ? .30 : 1);
    rig.hemi.color.setHex(preset.fill); rig.hemi.groundColor.setHex(preset.ground);
    rig.hemi.intensity = wet ? Math.max(.7, preset.ambient * .8) : preset.ambient;
    scene.fog.color.setHex(wet ? night ? 0x19273c : 0x7c929f : preset.fog);
    scene.fog.density = wet ? .006 : night ? .0045 : .004;
    rig.renderer.toneMappingExposure = night ? 1.17 : 1.02;
    for (const material of lighting.facades) material.emissiveIntensity = night ? 1.7 : 0;
    lighting.lampGlow.emissiveIntensity = night || wet ? 3 : 0;
    lighting.road.roughness = wet ? .16 : .92;
    lighting.road.metalness = wet ? .35 : 0;
    lighting.road.color.setHex(wet ? 0x526575 : 0xffffff);
    rain.visible = splashes.visible = wetRoad.visible = wet;
    headlights.visible = cityLights.visible = night || wet;
    wetRoad.material.uniforms.night.value = night ? 1 : 0;
    condition = Object.freeze({ time, weather, clock: preset.clock, label: preset.label + ' · ' + (wet ? 'RAIN' : 'CLEAR'),
      sky: uniforms.high.value.getHex(), rainActive: wet, headlightsOn: headlights.visible });
    scene.userData.conditions = condition;
  }
  function update(dt, focus) {
    elapsed += dt;
    if (!rain.visible) return;
    rain.position.set(focus.x, 0, focus.z);
    for (let i = 0; i < count; i++) {
      const at = i * 6, seed = i * 3;
      const y = ((seeds[seed + 1] - elapsed * 27) % 31 + 31) % 31;
      const x = seeds[seed] + y * .12, z = seeds[seed + 2];
      drops[at] = x; drops[at + 1] = y; drops[at + 2] = z;
      drops[at + 3] = x + .15; drops[at + 4] = y + 1.25; drops[at + 5] = z + .06;
    }
    rainGeometry.attributes.position.needsUpdate = true;
    for (let i = 0; i < splashCount; i++) {
      const phase = (elapsed * 2 + i * .137) % 1;
      let x = focus.x + seeds[i * 3], z = focus.z + seeds[i * 3 + 2];
      // Only splash on actual grid roads; stay out of the building parcels.
      if (Math.abs(x - Math.round(x / 100) * 100) > 9) z = Math.round(z / 100) * 100 + (i % 15 - 7);
      matrix.position.set(x, .047, z); matrix.scale.setScalar(.05 + phase * .45); matrix.updateMatrix();
      splashes.setMatrixAt(i, matrix.matrix);
    }
    splashes.instanceMatrix.needsUpdate = true;
    wetRoad.material.uniforms.clock.value = elapsed;
  }
  set('golden', 'clear');
  return { set, update, get state() { return condition; }, rain, headlights, cityLights };
}
