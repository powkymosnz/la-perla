// Day 4 asset integration checks cover traversal, pursuit, and camera behavior.
import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import { createWorld } from '../game/src/world.js';
import { createCar } from '../game/src/vehicles.js';
import { createPlayer } from '../game/src/player.js';
import { createCamera } from '../game/src/camera.js';
import { batchStaticParts, box } from '../game/src/geometry.js';
import { missions } from '../game/src/story.js';

// Canvas drawing is irrelevant to the geometry/collision checks; no browser renderer is emulated.
const context = new Proxy({}, { get: () => () => {}, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
const scene = new THREE.Scene();
const world = createWorld(scene);
const car = createCar(scene);
const player = createPlayer(scene, car);
const input = { take: () => false, axis: () => 0, down: () => false };
assert.equal(world.blocked(10, 0, 1.18, 2.34), false, 'old town east gate meets the road');
assert.equal(world.blocked(-300, 310, 1.18, 2.34), false, 'old town north gate meets the road');
for (const job of missions) {
  assert.equal(world.blocked(job.start[0], job.start[1], 1.18, 2.34), false, `${job.title} spawn is clear`);
  for (const goal of job.goal) assert.equal(world.blocked(...goal, .32), false, `${job.title} goal is reachable`);
}

// An offset root must retain its local bounds after baking; a failed inverse doubles vehicle positions.
const root = new THREE.Group(); root.position.set(150, 0, -70); scene.add(root);
box(root, 0x56aabb, 0, 1, 0, 2, 2, 4);
batchStaticParts(root, root.children.slice());
const baked = root.children.find(child => child.isMesh);
assert.ok(baked.geometry.attributes.color, 'opaque pieces bake vertex colors');
baked.geometry.computeBoundingBox();
assert.ok(Math.abs(baked.geometry.boundingBox.getCenter(new THREE.Vector3()).x) < .001);
assert.ok(Math.abs(baked.geometry.boundingBox.getCenter(new THREE.Vector3()).z) < .001);

player.reset(-300, -50, 0);
const drive = { ...input, axis: (p, n) => p === 'KeyW' && n === 'KeyS' ? 1 : 0 };
for (let i = 0; i < 240; i++) { player.update(1 / 120, drive, world); world.update(1 / 120, player, car); }
assert.ok(car.speed > 10 && car.root.position.z > -40, 'ordinary input drives through old town');
// The density pool sleeps distant pedestrians; verify a visible local walker instead.
const ped = world.pedestrians.find(p => p.role === 'walk' && p.root.position.distanceTo(player.target) < 130);
assert.ok(ped.root.userData.limbs.some(({ leg }) => Math.abs(leg.rotation.x) > .01), 'pedestrians walk');

world.raiseWanted(4);
for (let i = 0; i < 120; i++) world.update(1 / 120, player, car);
assert.equal(world.police.length, 3);
assert.ok(world.helicopter, 'four-star pursuit deploys the helicopter');
assert.ok(Math.abs(world.helicopter.rotor.rotation.y) > 0, 'helicopter rotor animates during pursuit');
for (const unit of world.police) assert.equal(world.blocked(unit.root.position.x, unit.root.position.z, 1.1), false);
world.clearHeat();
assert.equal(world.police.length, 0);
assert.equal(world.helicopter, null);

const followAt = hz => {
  const camera = createCamera();
  player.reset(-300, -100, 0);
  camera.follow(1 / hz, player, car, world);
  for (let i = 0; i < hz * 2; i++) { car.root.position.z += 12 / hz; camera.follow(1 / hz, player, car, world); }
  const lag = car.root.position.z - camera.camera.position.z;
  player.reset(500, 0, Math.PI / 2);
  camera.follow(1 / hz, player, car, world);
  assert.ok(camera.camera.position.distanceTo(player.target) < 20, 'mission changes reset camera lag');
  return lag;
};
assert.ok(Math.abs(followAt(30) - followAt(144)) < .5, 'camera lag is frame-rate independent');
console.log('PASS: all mission spawns/goals, local-space vertex-color baking, driving/walk animation, four-star pursuit/cleanup, camera rates/reset.');
