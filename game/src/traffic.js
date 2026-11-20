import * as THREE from '../vendor/three.module.min.js';
import { carPaint, carTemplate, shadowGeometry, shadowMaterial } from './car-model.js';

// A bounded road graph: a lane is a closed rectangle; corners advance one axis at a time.
export const TRAFFIC_COLORS = [0xf0b632, 0x38aeb1, 0xc86e66, 0x727db1, 0x9fbd87, 0xf1dac2, 0x813e57, 0x427198, 0xd88842];
export const CAR_RENDER_CAP = 104;
export function roadLoop(x0, z0, x1, z1, clockwise = true) {
  const lane = 3.1;
  return clockwise ? [[x0 + lane, z0 + lane], [x0 + lane, z1 - lane], [x1 - lane, z1 - lane], [x1 - lane, z0 + lane]] :
    [[x0 - lane, z0 - lane], [x1 + lane, z0 - lane], [x1 + lane, z1 + lane], [x0 - lane, z1 + lane]];
}
function placeOnLoop(item, distance) {
  for (let edge = 0; edge < item.route.length; edge++) {
    const a = item.route[edge], b = item.route[(edge + 1) % item.route.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (distance <= length) {
      const t = distance / length;
      item.root.position.set(a[0] + (b[0] - a[0]) * t, 0, a[1] + (b[1] - a[1]) * t);
      item.next = (edge + 1) % item.route.length;
      item.heading = Math.atan2(b[0] - a[0], b[1] - a[1]);
      return;
    }
    distance -= length;
  }
}
export function createTraffic(scene) {
  const items = [];
  function add(x, z, heading, index, parked = false, route = null) {
    const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = heading;
    items.push({ root, color: TRAFFIC_COLORS[index % TRAFFIC_COLORS.length], kind: index % 4,
      heading, speed: 6.5 + index % 5 * .8, wait: parked ? Infinity : 0, flee: 0, parked, route, next: 1, roll: 0, clear: true });
    return items[items.length - 1];
  }
  // Keep the mission taxi in place and move the starter neighbor to the opposite lane.
  const marketCar = add(521, 94, Math.PI / 2, 3, true);
  add(601.6, -56, 0, 0, true);
  // One loop in each direction on every block perimeter populates every district's roads.
  for (let gx = -600; gx < 600; gx += 200) for (let gz = -600; gz < 600; gz += 200) {
    for (const clockwise of [true, false]) {
      const route = roadLoop(gx, gz, gx + 200, gz + 200, clockwise);
      for (let n = 0; n < 5; n++) {
        const item = add(0, 0, 0, items.length, false, route);
        placeOnLoop(item, n * 154 + ((gx + gz + 1200) % 53));
      }
    }
  }
  // Additional boulevard shuttles make the waterfront continuous rather than one distant car.
  for (const x of [-300, 400, 500]) for (const clockwise of [true, false]) {
    const route = roadLoop(x, -200, x + 100, 200, clockwise);
    for (let n = 0; n < 21; n++) {
      const item = add(0, 0, 0, items.length, false, route);
      placeOnLoop(item, n * 45 + (clockwise ? 8 : 20));
    }
  }
  // Curb bays stay outside the two moving lanes and leave intersections/gates clear.
  for (let x = -500; x <= 600; x += 100) for (let z = -550; z <= 550; z += 100) {
    if ((x + z + 550) % 300 === 0) continue;
    for (const side of [-1, 1]) add(x + side * 7.0, z + side * 12, side > 0 ? Math.PI : 0, items.length, true);
  }
  for (const x of [-300, 400, 500, 600]) for (let z = -175; z <= 180; z += 26) {
    if (Math.abs(z - Math.round(z / 100) * 100) < 16) continue;
    for (const side of [-1, 1]) add(x + side * 7, z, side > 0 ? Math.PI : 0, items.length, true);
  }
  const cap = scene.userData.software ? 84 : CAR_RENDER_CAP;
  function batch(geometry, material, count, shadow = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false;
    mesh.castShadow = shadow && !scene.userData.software; mesh.receiveShadow = shadow;
    mesh.count = 0; scene.add(mesh); return mesh;
  }
  const models = ['sedan', 'compact', 'van', 'taxi'].map(kind => {
    const model = carTemplate(kind);
    return { ...model, layers: model.layers.map(([geometry, material], i) => batch(geometry, material ?? carPaint(), cap, i < 2)),
      tires: batch(model.wheel, model.wheelMaterial, cap * 4, true), count: 0 };
  });
  const shadows = batch(shadowGeometry, shadowMaterial, cap);
  const tint = new THREE.Color(), wheel = new THREE.Object3D(), wheelWorld = new THREE.Matrix4();
  const projected = new THREE.Vector3();
  const buckets = new Map();
  let clock = 0;
  function update(dt, player, police, raiseWanted) {
    clock += dt;
    const sense = clock >= .2;
    if (sense) {
      clock %= .2; buckets.clear();
      for (const item of items) if (item.root.visible) {
        const p = item.root.position, key = `${Math.floor(p.x / 12)},${Math.floor(p.z / 12)}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(item);
      }
    }
    for (const item of items) {
      if (!item.root.visible || item.parked) continue;
      item.crash = Math.max(0, (item.crash || 0) - dt);
      item.flee = Math.max(0, item.flee - dt);
      if (sense) {
        const p = item.root.position, fx = Math.sin(item.heading), fz = Math.cos(item.heading);
        const ax = p.x + fx * 7, az = p.z + fz * 7;
        const bx = Math.floor(ax / 12), bz = Math.floor(az / 12);
        item.clear = !police.some(unit => Math.hypot(unit.root.position.x - ax, unit.root.position.z - az) < 4);
        for (let x = bx - 1; item.clear && x <= bx + 1; x++) for (let z = bz - 1; item.clear && z <= bz + 1; z++) {
          const neighbors = buckets.get(`${x},${z}`);
          if (!neighbors) continue;
          item.clear = !neighbors.some(other => {
            if (other === item || other.parked) return false;
            const dx = other.root.position.x - p.x, dz = other.root.position.z - p.z;
            const forward = dx * fx + dz * fz;
            return forward > 0 && forward < 8.5 && Math.abs(dx * fz - dz * fx) < 2.1;
          });
        }
        const distance = Math.hypot(p.x - player.target.x, p.z - player.target.z);
        if (player.driving && player.speed > 10 && distance < 8) {
          item.flee = 3;
          if (distance < 3.8 && !item.crash) { item.crash = 4; raiseWanted(1, 'TRAFFIC COLLISION'); }
        }
      }
      item.wait = Math.max(0, item.wait - dt);
      if (!item.clear || item.wait > 0) continue;
      const goal = item.route[item.next], p = item.root.position;
      const dx = goal[0] - p.x, dz = goal[1] - p.z, distance = Math.hypot(dx, dz);
      const travel = Math.min(distance, (item.speed + (item.flee > 0 ? 3 : 0)) * dt);
      if (distance > .0001) { p.x += dx / distance * travel; p.z += dz / distance * travel; item.heading = Math.atan2(dx, dz); }
      item.roll = (item.roll + travel / models[item.kind].radius) % (Math.PI * 2);
      item.root.rotation.y = item.heading;
      if (distance <= travel + .001) { item.next = (item.next + 1) % item.route.length; }
    }
  }
  const frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 3.5);
  function draw(focus, camera) {
    if (camera) { camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); }
    models.forEach(model => { model.count = 0; });
    // Fixed pool, compacted near the camera. Simulation and theft flags never depend on render culling.
    let shown = 0;
    for (let radius = 0; radius < 210 && shown < cap; radius += 35) for (const item of items) {
      if (!item.root.visible) continue;
      if (camera) {
        sphere.center.copy(item.root.position); sphere.center.y = 1;
        if (!frustum.intersectsSphere(sphere)) continue;
      }
      const distance = Math.hypot(item.root.position.x - focus.x, item.root.position.z - focus.z);
      if (camera && distance < 88) {
        const c = Math.cos(item.heading), s = Math.sin(item.heading), p = item.root.position;
        let left = Infinity, right = -Infinity, top = -Infinity, bottom = Infinity;
        for (const x of [-1.18, 1.18]) for (const y of [0, 2.16]) for (const z of [-2.5, 2.5]) {
          projected.set(p.x + x * c + z * s, p.y + y, p.z - x * s + z * c).project(camera);
          left = Math.min(left, projected.x); right = Math.max(right, projected.x);
          bottom = Math.min(bottom, projected.y); top = Math.max(top, projected.y);
        }
        // Keep close cars whole at the viewport edge rather than drawing a cropped chassis.
        if (left < -1.02 || right > 1.02 || bottom < -1.03 || top > 1.02) continue;
      }
      if (distance < radius || distance >= radius + 35 || shown >= cap) continue;
      const model = models[item.kind], index = model.count++;
      item.root.rotation.y = item.heading;
      item.root.updateMatrix();
      for (const mesh of model.layers) mesh.setMatrixAt(index, item.root.matrix);
      model.layers[0].setColorAt(index, tint.setHex(item.color));
      model.mounts.forEach(({ x, y, z }, i) => {
        wheel.position.set(x, y, z); wheel.rotation.x = item.roll; wheel.updateMatrix();
        model.tires.setMatrixAt(index * 4 + i, wheelWorld.multiplyMatrices(item.root.matrix, wheel.matrix));
      });
      shadows.setMatrixAt(shown++, item.root.matrix);
    }
    function upload(mesh, count) {
      mesh.count = count; mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    for (const model of models) {
      for (const mesh of model.layers) upload(mesh, model.count);
      upload(model.tires, model.count * 4);
    }
    upload(shadows, shown);
    return shown;
  }
  return { items, marketCar, update, draw, cap };
}
