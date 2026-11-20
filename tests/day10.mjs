import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import { createCamera } from '../game/src/camera.js';
import { createInput } from '../game/src/input.js';

globalThis.window = new EventTarget();
globalThis.document = new EventTarget();
globalThis.HTMLButtonElement = class {};
const input = createInput();
const rig = createCamera();
const player = { target: new THREE.Vector3(100, 0, 100), heading: 0, driving: true };
const car = { speed: 24 };
const openRoad = { blocked: () => false };
const positions = {};
const directions = {};
const keys = ['chase', 'hood', 'side', 'lowFront', 'highWide'];
assert.deepEqual(rig.modes, keys);
function pressC(repeat = false) {
  window.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code: 'KeyC', repeat }));
  if (input.take('KeyC')) rig.cycle();
}
for (const mode of keys) {
  assert.equal(rig.mode, mode);
  rig.follow(1 / 60, player, car, openRoad);
  positions[mode] = rig.camera.position.clone().sub(player.target);
  directions[mode] = rig.camera.getWorldDirection(new THREE.Vector3()).toArray().join(',');
  pressC();
}
assert.equal(rig.mode, 'chase');
pressC(true);
assert.equal(rig.mode, 'chase', 'holding C does not skip presets');
assert.equal(new Set(Object.values(directions)).size, 5);
assert.ok(positions.chase.z < -7);
assert.ok(positions.hood.z > 0 && positions.hood.z < 2);
assert.ok(positions.side.x > 6 && Math.abs(positions.side.z) < 3);
assert.ok(positions.lowFront.z > 5 && positions.lowFront.y < 1.5);
assert.ok(positions.highWide.y > 15 && positions.highWide.length() > 25);
assert.throws(() => rig.setMode('missing'), RangeError);
assert.equal(rig.mode, 'chase');

// Thin walls on both sides of a tight street, including a height clearance probe.
const alley = { blocked: (x, z, w, d, y) => Math.abs(x - 100) + w > 2.5 && y < 30 };
for (const mode of keys) {
  rig.setMode(mode);
  player.heading = Math.PI / 4;
  rig.follow(1 / 60, player, car, alley, .45, -.3);
  const { x, y, z } = rig.camera.position;
  assert.ok(y > .68 && !alley.blocked(x, z, .42, .42, y - .42), mode + ' clears the wall and ground');
}
player.driving = false;
rig.setMode('hood');
rig.follow(1 / 60, player, car, openRoad);
assert.ok(rig.camera.position.distanceTo(player.target) > 5, 'walking retains a third-person view');
player.driving = true;
player.target.z += 300;
rig.follow(1 / 60, player, car, openRoad);
assert.ok(rig.camera.position.distanceTo(player.target) < 2, 'hood returns on entry or relocation');
console.log('PASS: five camera poses and orientations, C input and wrapping, wall and ground clearance, on-foot fallback and relocation.');
