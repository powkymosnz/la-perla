import * as THREE from '../vendor/three.module.min.js';
import { box, taperedBox, batchStaticParts } from './geometry.js';

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
// Bake each model once, then share its parts between every instanced civilian vehicle.
function templates() {
  return ['sedan', 'compact', 'van', 'taxi'].map(kind => {
    const root = new THREE.Group();
    const w = kind === 'van' ? 2.05 : kind === 'compact' ? 1.7 : 1.86;
    const d = kind === 'van' ? 4.7 : kind === 'compact' ? 3.3 : 4.15;
    const body = new THREE.Group(); root.add(body);
    taperedBox(body, 0xffffff, 0, .76, 0, w, .56, d, .95, .92);
    box(body, 0xffffff, 0, 1.55, -.18, w * .82, .12, kind === 'van' ? 2.8 : 1.8);
    if (kind === 'van') box(body, 0xffffff, 0, 1.19, -.9, w * .85, .7, 1.5);
    batchStaticParts(body, body.children.slice());
    const details = new THREE.Group(); root.add(details);
    taperedBox(details, 0x254655, 0, 1.19, -.1, w * .83, .65, kind === 'van' ? 2.8 : 1.95, .84, .78);
    for (const side of [-1, 1]) for (const axle of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.39, .39, .25, 8), new THREE.MeshLambertMaterial({ color: 0x222734 }));
      wheel.rotation.z = Math.PI / 2; wheel.position.set(side * w / 2, .4, axle * d * .31); details.add(wheel);
      box(details, 0xabb8ad, side * (w / 2 + .14), 1.17, .65, .24, .15, .23);
    }
    box(details, 0xffebae, 0, .77, d / 2 + .02, w * .75, .19, .07);
    box(details, 0xd94e55, 0, .77, -d / 2 - .02, w * .7, .18, .07);
    box(details, 0x3a3640, 0, .44, d / 2 + .04, w * .75, .14, .11);
    if (kind === 'taxi') { box(details, 0xffd553, 0, 1.75, 0, .65, .22, .35); box(details, 0x36313d, 0, 1.88, .18, .45, .06, .03); }
    batchStaticParts(details, details.children.slice());
    return { body: body.children[0].geometry, detail: details.children[0].geometry };
  });
}
export function createTraffic(scene) {
  const items = [];
  function add(x, z, heading, index, parked = false, route = null) {
    const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = heading;
    items.push({ root, color: TRAFFIC_COLORS[index % TRAFFIC_COLORS.length], kind: index % 4,
      heading, speed: 6.5 + index % 5 * .8, wait: parked ? Infinity : 0, flee: 0, parked, route, next: 1, sense: index % 5 * .04, clear: true });
    return items[items.length - 1];
  }
  // Keep the mission taxi and starter's neighbor at their established interaction positions.
  const marketCar = add(521, 94, Math.PI / 2, 3, true);
  add(598, -57, 0, 0, true);
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
    for (let n = 0; n < 15; n++) { const item = add(0, 0, 0, items.length, false, route); placeOnLoop(item, n * 63); }
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
  const cap = scene.userData.software ? 72 : CAR_RENDER_CAP;
  const models = templates().map(({ body, detail }) => {
    const shell = new THREE.InstancedMesh(body, new THREE.MeshLambertMaterial({ vertexColors: true }), cap);
    const trim = new THREE.InstancedMesh(detail, new THREE.MeshLambertMaterial({ vertexColors: true }), cap);
    for (const mesh of [shell, trim]) { mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = !scene.userData.software; mesh.count = 0; scene.add(mesh); }
    return { shell, trim, count: 0, detailCount: 0 };
  });
  const transform = new THREE.Object3D(), tint = new THREE.Color();
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
        const neighbors = buckets.get(`${Math.floor(ax / 12)},${Math.floor(az / 12)}`) ?? [];
        item.clear = !neighbors.some(other => {
          if (other === item || other.parked) return false;
          const dx = other.root.position.x - p.x, dz = other.root.position.z - p.z;
          const forward = dx * fx + dz * fz;
          return forward > 0 && forward < 8.5 && Math.abs(dx * fz - dz * fx) < 2.1;
        }) && !police.some(unit => Math.hypot(unit.root.position.x - ax, unit.root.position.z - az) < 4);
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
      item.root.rotation.y = item.heading;
      if (distance <= travel + .001) { item.next = (item.next + 1) % item.route.length; }
    }
  }
  const frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 3.5);
  function draw(focus, camera) {
    if (camera) { camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); }
    models.forEach(model => { model.count = model.detailCount = 0; });
    // Fixed pool, compacted near the camera. Simulation and theft flags never depend on render culling.
    let shown = 0;
    for (let radius = 0; radius < 210 && shown < cap; radius += 35) for (const item of items) {
      if (!item.root.visible) continue;
      if (camera) { sphere.center.copy(item.root.position); sphere.center.y = 1; if (!frustum.intersectsSphere(sphere)) continue; }
      const distance = Math.hypot(item.root.position.x - focus.x, item.root.position.z - focus.z);
      if (distance < radius || distance >= radius + 35 || shown >= cap) continue;
      const model = models[item.kind], index = model.count++;
      transform.position.copy(item.root.position); transform.rotation.set(0, item.heading, 0); transform.scale.set(1, 1, 1); transform.updateMatrix();
      model.shell.setMatrixAt(index, transform.matrix);
      // Distant vehicles keep their colored silhouette; tire and glass detail is local only.
      if (distance < 75 || !scene.userData.software) model.trim.setMatrixAt(model.detailCount++, transform.matrix);
      model.shell.setColorAt(index, tint.setHex(item.color)); shown++;
    }
    for (const model of models) for (const mesh of [model.shell, model.trim]) { mesh.count = mesh === model.trim ? model.detailCount : model.count; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
    return shown;
  }
  return { items, marketCar, update, draw, cap };
}
