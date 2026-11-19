import * as THREE from '../vendor/three.module.min.js';

const sunDirection = new THREE.Vector3(.8, .19, .68).normalize();

export function createRender() {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf7ac9f, .0043);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const gl = renderer.getContext();
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const software = info && /swiftshader|llvmpipe/i.test(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  // Share software-renderer constraints with the bounded ambient instance pools.
  scene.userData.software = Boolean(software);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, software ? .55 : 1));
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
      high: { value: new THREE.Color(0x9776ae) },
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
      void main() {
        vec3 dir = normalize(direction);
        float towardSun = max(dot(dir, sun), 0.0);
        vec3 color = mix(horizon, high, smoothstep(0.0, 0.65, dir.y));
        color += vec3(0.45, 0.14, 0.025) * pow(towardSun, 16.0);
        color += vec3(0.7, 0.32, 0.095) * pow(towardSun, 240.0);
        color += vec3(2.0, 1.45, 0.76) * smoothstep(0.99945, 0.9996, towardSun);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
  sky.frustumCulled = false;
  sky.renderOrder = -1;
  scene.add(sky, new THREE.HemisphereLight(0xffd9c9, 0x807baf, 2.25));
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

  return { scene, renderer, software, resize, draw };
}
