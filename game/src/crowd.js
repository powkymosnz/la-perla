import * as THREE from '../vendor/three.module.min.js';
import { BEACH_BAYS } from './street-life.js';

export const PEDESTRIAN_CAP = 1800;
const clothes = [0xe78763, 0x29a3a1, 0xf3c65c, 0xd6688c, 0x617eb8, 0x8876ad, 0xf4e1bc, 0x567854];
const skins = [0xc78661, 0xe9b78a, 0x965c43, 0x673f35, 0xd69b72];
// Persistent Idle/Walk/Sit/Beach roles with Flee as a timed, interruptible state.
export function createCrowd(scene, blocked) {
  const items = [];
  const add = (x, z, role = 'walk', heading = 0, route = null) => {
    if (items.length >= PEDESTRIAN_CAP || blocked(x, z, .27)) return null;
    const i = items.length, root = new THREE.Group(); root.position.set(x, .2, z);
    root.userData.limbs = [-1, 1].map(side => ({ side, arm: { rotation: { x: 0 } }, leg: { rotation: { x: 0 } } }));
    const ped = { root, role, homeX: x, homeZ: z, heading, route, next: 1,
      speed: 1.05 + i % 4 * .18, flee: 0, phase: i * 1.77, sense: i % 5 * .04, panicked: false,
      shirt: clothes[i % clothes.length], skin: skins[i % skins.length], pants: [0x303c55, 0x675a52, 0xe3cc9f, 0x3a656b][i % 4], hat: i % 3 === 0, variant: i };
    items.push(ped); return ped;
  };
  // Busy primary promenades come first so the visible pool always contains street-level life.
  for (const x of [-400, -300, -200, 300, 400, 500, 600]) for (let z = -180; z <= 190; z += 8) for (const side of [-1, 1]) {
    const route = [[x + side * 11.7, -188], [x + side * 11.7, 188]];
    const p = add(x + side * 11.7, z, 'walk', side > 0 ? 0 : Math.PI, route);
    if (p) p.next = side > 0 ? 1 : 0;
  }
  // Each sidewalk has a small closed promenade around its own block, never a road shortcut.
  for (let x = -550; x < 600; x += 100) for (let z = -550; z < 600; z += 100) {
    const route = [[x - 38.3, z - 38.3], [x - 38.3, z + 38.3], [x + 38.3, z + 38.3], [x + 38.3, z - 38.3]];
    for (let n = 0; n < 4; n++) {
      const a = route[n], b = route[(n + 1) % 4], t = .23 + ((x + z + 1100) % 7) * .07;
      const ped = add(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 'walk', Math.atan2(b[0] - a[0], b[1] - a[1]), route);
      if (ped) ped.next = (n + 1) % 4;
    }
  }
  // Chatting pairs on the boulevards and small plaza gatherings make readable social clusters.
  for (const roadX of [-400, -300, -200, 100, 300, 400, 500, 600]) for (let z = -180; z <= 180; z += 44) {
    for (let n = 0; n < 3; n++) add(roadX - 12.1 - (n === 2 ? 1 : 0), z + n * 1.25, 'chat', n % 2 ? Math.PI : 0);
  }
  const benches = [[-420, -88], [-312, 112], [76, -88], [-312, -32], [-312, 32], [-212, -32], [588, 18], [588, 78], [588, 118], [588, 178], [612, -20], [612, 82]];
  for (const [x, z] of benches) for (const side of [-1, 1]) add(x + side * .75, z + .1, 'sit', 0);
  // Market vendors face customers; domino players sit around the actual table, fully articulated.
  for (const [x, z] of [[527, 126], [541, 126], [555, 126], [571, 145], [527, 159], [523, 99]]) {
    add(x, z - 1.8, 'vendor', 0);
    for (let n = 0; n < 3; n++) add(x - 2 + n * 1.65, z + 3 + (n % 2) * .7, 'chat', Math.PI);
  }
  for (const [x, z, heading] of [[513.5, 105, Math.PI / 2], [516.5, 105, -Math.PI / 2], [515, 103.5, 0], [515, 106.5, Math.PI]]) add(x, z, 'domino', heading);
  // Visitors cluster around the market entrances and produce stalls.
  for (const [x, z] of [[508, 141], [518, 178], [544, 178], [566, 178], [584, 157], [505, 118]]) {
    add(x, z, 'walk', Math.PI / 2, [[x, z], [x + 5, z + 1], [x + 2, z + 5], [x - 3, z + 2]]);
    add(x + 1.3, z + 1.1, 'chat', Math.PI);
    add(x - 1.3, z + 1.2, 'chat', 0);
  }
  const marketRoute = [[512, 112], [580, 112], [580, 178], [512, 178]];
  for (let i = 0; i < 24; i++) {
    const edge = i % 4, a = marketRoute[edge], b = marketRoute[(edge + 1) % 4], t = (Math.floor(i / 4) + .4) / 6;
    const p = add(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 'walk', Math.atan2(b[0] - a[0], b[1] - a[1]), marketRoute);
    if (p) p.next = (edge + 1) % 4;
  }
  // Beachgoers occupy the same seeded umbrella bays as the static towels and canopies.
  for (const [x, z] of BEACH_BAYS) {
    add(x + 1.7, z + 2.5, 'beach', 0);
    add(x - 2.6, z - 2, 'chat', Math.PI / 2);
  }
  // Static population capacity is separate from the visible instance budget.
  const cap = scene.userData.software ? 162 : 225;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshLambertMaterial(), cap * 16);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = !scene.userData.software; mesh.count = 0; scene.add(mesh);
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  let count = 0, shown = 0, active = [], refresh = 0, simClock = 0;
  let focusX = 0, focusZ = 0;
  function update(dt, player, wanted, move) {
    refresh -= dt; simClock += dt;
    if (refresh <= 0 || Math.hypot(player.target.x - focusX, player.target.z - focusZ) > 35) {
      focusX = player.target.x; focusZ = player.target.z; refresh = .35;
      active = items.filter(ped => Math.hypot(ped.root.position.x - focusX, ped.root.position.z - focusZ) < 180);
    }
    if (simClock < 1 / 30) return;
    const step = Math.min(simClock, .1); simClock = 0;
    for (const ped of active) {
      const p = ped.root.position;
      ped.sense -= step;
      if (ped.sense <= 0) {
        ped.sense += .2;
        const dx = p.x - player.target.x, dz = p.z - player.target.z, distance2 = dx * dx + dz * dz;
        if ((wanted > 0 && distance2 < 42 * 42) || (player.driving && player.speed > 12 && distance2 < 9 * 9)) {
          ped.flee = 4;
          // Run along the promenade rather than diagonally across a busy road.
          if (ped.route) {
            const goal = ped.route[ped.next];
            ped.heading = Math.atan2(goal[0] - p.x, goal[1] - p.z);
          } else ped.heading = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dz > 0 ? 0 : Math.PI);
        }
      }
      const fleeing = ped.flee > 0;
      if (!fleeing && ped.panicked) {
        if (ped.route) ped.next = (ped.next + 1) % ped.route.length;
        else { p.x = ped.homeX; p.z = ped.homeZ; }
      }
      ped.panicked = fleeing; ped.flee = Math.max(0, ped.flee - step);
      const walking = ped.role === 'walk' || fleeing;
      if (walking) {
        const speed = ped.speed * (fleeing ? 3.1 : 1), travel = speed * step;
        if (ped.route) {
          const goal = ped.route[ped.next], dx = goal[0] - p.x, dz = goal[1] - p.z, distance = Math.hypot(dx, dz);
          ped.heading = Math.atan2(dx, dz);
          if (distance <= travel + .15) ped.next = (ped.next + 1) % ped.route.length;
        }
        const result = move(p, Math.sin(ped.heading) * travel, Math.cos(ped.heading) * travel, .27);
        if (result.hitX || result.hitZ) { if (ped.route) ped.next = (ped.next + 1) % ped.route.length; else ped.heading += Math.PI / 2; }
        ped.phase += step * speed * 4;
      } else ped.phase += step * 1.7;
      p.y = p.x > 618 ? 0 : .2;
      ped.root.rotation.y = ped.heading;
      for (const { arm, leg, side } of ped.root.userData.limbs) {
        leg.rotation.x = walking ? Math.sin(ped.phase) * side * (fleeing ? .8 : .48) : 0;
        arm.rotation.x = walking ? -leg.rotation.x * .75 : Math.sin(ped.phase + side) * .12;
      }
    }
  }
  function part(ped, x, y, z, w, h, d, tint, tilt = 0) {
    const cs = Math.cos(ped.heading), sn = Math.sin(ped.heading), p = ped.root.position;
    dummy.position.set(p.x + x * cs + z * sn, p.y + y, p.z - x * sn + z * cs);
    dummy.rotation.set(tilt, ped.heading, 0, 'YXZ'); dummy.scale.set(w, h, d); dummy.updateMatrix();
    mesh.setMatrixAt(count, dummy.matrix); mesh.setColorAt(count++, color.setHex(tint));
  }
  const frustum = new THREE.Frustum(), viewProjection = new THREE.Matrix4(), sphere = new THREE.Sphere(new THREE.Vector3(), 1.5);
  function draw(focus, camera) {
    if (camera) { camera.updateMatrixWorld(); frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); }
    count = shown = 0;
    for (let radius = 0; radius < 180 && shown < cap; radius += 30) for (const ped of items) {
      const p = ped.root.position;
      if (camera) { sphere.center.copy(p); sphere.center.y = 1; if (!frustum.intersectsSphere(sphere)) continue; }
      const distance = Math.hypot(p.x - focus.x, p.z - focus.z);
      if (distance < radius || distance >= radius + 30 || shown >= cap) continue;
      const fleeing = ped.flee > 0, sitting = !fleeing && (ped.role === 'sit' || ped.role === 'domino');
      if (ped.role === 'beach' && !fleeing) {
        part(ped, 0, .24, 0, .54, .27, .74, ped.shirt);
        part(ped, 0, .28, .58, .29, .28, .3, ped.skin);
        for (const side of [-1, 1]) { part(ped, side * .15, .18, -.66, .21, .19, .7, ped.skin); part(ped, side * .37, .22, -.02, .13, .15, .7, ped.skin); }
      } else {
        const hip = sitting ? .55 : .88;
        part(ped, 0, hip + .29, 0, .53, .6, .33, ped.shirt);
        part(ped, 0, hip + .76, .01, .29, .3, .28, ped.skin);
        part(ped, 0, hip + .92, -.03, .31, .1, .31, ped.variant % 2 ? 0x342e36 : ped.skin);
        if (ped.hat) { part(ped, 0, hip + .98, 0, .49, .055, .43, 0xf3d494); part(ped, 0, hip + 1.05, 0, .3, .13, .29, 0xd5ad71); }
        for (const { side, arm, leg } of ped.root.userData.limbs) {
          const a = sitting ? -1.25 + Math.sin(ped.phase) * .12 : arm.rotation.x;
          part(ped, side * .34, hip + .28 - Math.cos(a) * .17, -Math.sin(a) * .17, .17, .28, .19, ped.shirt, a);
          part(ped, side * .34, hip + .28 - Math.cos(a) * .4, -Math.sin(a) * .4, .14, .24, .15, ped.skin, a);
          if (sitting) {
            // Bent knees reach the ground; seated vendors never have floating shoe meshes.
            part(ped, side * .145, hip, .2, .2, .19, .45, ped.pants);
            part(ped, side * .145, .31, .43, .19, .46, .2, ped.pants);
            part(ped, side * .145, .08, .5, .23, .14, .32, 0x30333c);
          } else {
            const l = leg.rotation.x;
            part(ped, side * .145, hip - Math.cos(l) * .37, -Math.sin(l) * .37, .2, .74, .23, ped.pants, l);
            part(ped, side * .145, hip - Math.cos(l) * .8, -Math.sin(l) * .8 + .04, .23, .14, .32, 0x30333c, l);
          }
        }
      }
      shown++;
    }
    mesh.count = count; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return shown;
  }
  return { items, add, benches, update, draw, cap };
}
