import assert from 'node:assert/strict';
import * as THREE from '../game/vendor/three.module.min.js';
import { createCombat } from '../game/src/combat.js';
import { createMissions } from '../game/src/missions.js';
import { newGame } from '../game/src/save.js';
import { createCar } from '../game/src/vehicles.js';
import { districtNameAt } from '../game/src/city.js';
import { dispatchUnits, clockLabel, timerLabel } from '../game/src/hud.js';

// Exercise actual weapon/ammo input, not a separate screenshot-only HUD model.
const scene = new THREE.Scene();
const world = { blocked: () => false, pedestrians: [], raiseWanted() {} };
const combat = createCombat(scene, world, { effect() {} });
const player = { driving: false, carjacking: false, aim: 0, target: { x: 0, z: 0 } };
const press = (...keys) => { const pressed = new Set(keys); return { take: key => pressed.delete(key) }; };
for (let slot = 2; slot <= 5; slot++) {
  const ammo = combat.slots[slot - 1].ammo;
  combat.update(1, player, press('Digit' + slot, 'KeyF'));
  assert.equal(combat.active, slot);
  assert.equal(combat.slots[slot - 1].ammo, ammo - 1);
  combat.update(0, player, press('KeyF'));
  assert.equal(combat.slots[slot - 1].ammo, ammo - 1, 'cooldown blocks extra shots');
}
combat.update(1, { ...player, driving: true }, press('Digit2', 'KeyF'));
assert.equal(combat.active, 2, 'selection works in the car');
assert.equal(combat.slots[1].ammo, 71, 'driving does not consume ammunition');
for (let i = 0; i < 80; i++) combat.update(1, player, press('KeyF'));
assert.equal(combat.slots[1].ammo, 0, 'ammo cannot go negative');
assert.match(combat.label, /EMPTY/);
combat.reset();
assert.equal(combat.slots[1].ammo, 72);
assert.equal(combat.active, 1);
assert.equal(combat.slots[0].ammo, Infinity);

const missions = createMissions(newGame());
missions.start(4);
assert.equal(missions.progress.current, 1);
assert.equal(missions.progress.total, 4);
missions.launch({ thefts: 0 });
assert.equal(missions.progress.current, 2);
missions.update(2, { target: { x: 600, z: 200 } }, { raiseWanted() {} }, { health: 1 });
assert.equal(missions.progress.current, 3, 'cargo pickup advances the live stage bar');
assert.equal(missions.elapsed, 2);
missions.clear();
assert.equal(missions.progress.total, 0);
assert.equal(missions.remaining, null);

const patrol = { name: 'TARPON-11', root: { position: { x: 3, z: 4 } }, contact: 0 };
const dispatch = { police: [patrol], unseen: 0, helicopter: { root: { position: { x: 0, z: 12 } } } };
assert.deepEqual(dispatchUnits(dispatch, { x: 0, z: 0 }), [
  { name: 'TARPON-11', distance: 5, status: 'PURSUIT' },
  { name: 'AIR ONE', distance: 12, status: 'SPOTLIGHT' },
]);
patrol.contact = .2;
assert.equal(dispatchUnits(dispatch, { x: 3, z: 4 })[0].status, 'RAMMING');
assert.equal(dispatchUnits(dispatch, { x: 3, z: 4 })[0].distance, 0);
dispatch.unseen = 1;
assert.equal(dispatchUnits(dispatch, { x: 0, z: 0 })[0].status, 'SEARCHING');
const block = new THREE.Group(), unit = new THREE.Group();
block.position.set(100, 0, 0); unit.position.set(5, 0, 0); block.add(unit);
block.userData.models = [{ root: unit }];
dispatch.roadblock = block;
assert.deepEqual(dispatchUnits(dispatch, { x: 0, z: 0 }).at(-1), { name: 'BARRIER-1', distance: 105, status: 'ROADBLOCK' });

assert.equal(districtNameAt(-300, -80), 'Old Town');
assert.equal(districtNameAt(600, 120), 'Market');
assert.equal(districtNameAt(600, -40), 'Port Fort');
assert.equal(districtNameAt(400, -40), 'Glass Towers');
assert.equal(clockLabel(0), '18:45');
assert.equal(clockLabel(4), '18:46');
assert.equal(timerLabel(61.1), '01:02');

const context = new Proxy({}, { get: () => () => {}, set: () => true });
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const car = createCar(scene);
const drive = { axis: positive => positive === 'KeyW' ? 1 : 0, down: () => false };
assert.equal(car.gear, 'N');
for (let i = 0; i < 300; i++) car.update(1 / 120, drive, { move(position, dx, dz) { position.x += dx; position.z += dz; return {}; } });
assert.ok(car.speed * 3.6 >= 60);
assert.ok(Number(car.gear) >= 3);
console.log('PASS: five weapon selections/ammo/cooldown/reset, live mission stages/timers, dispatch distances/tactics/roadblock transforms, district clock and physical driving gears.');
