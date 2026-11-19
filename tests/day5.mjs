import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import * as THREE from '../game/vendor/three.module.min.js';
import { createWorld } from '../game/src/world.js';
import { createCar } from '../game/src/vehicles.js';
import { createPlayer } from '../game/src/player.js';
import { createTraffic, CAR_RENDER_CAP } from '../game/src/traffic.js';
import { PEDESTRIAN_CAP } from '../game/src/crowd.js';

const context = new Proxy({}, { get: () => () => {}, set: () => true });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };
const scene = new THREE.Scene(), world = createWorld(scene), car = createCar(scene), player = createPlayer(scene, car);
assert.ok(world.traffic.length > 500);
assert.ok(world.pedestrians.length > 1000 && world.pedestrians.length <= PEDESTRIAN_CAP);
assert.equal(world.population.umbrellas, 113);
for (const role of ['walk', 'chat', 'sit', 'domino', 'vendor', 'beach']) assert.ok(world.pedestrians.some(p => p.role === role), role);
assert.equal(world.pedestrians.filter(p => p.role === 'domino').length, 4);
assert.ok(new Set(world.traffic.map(t => t.color)).size >= 8);
assert.equal(new Set(world.traffic.map(t => t.kind)).size, 4);

// Exercise the real civilian routes for four simulated minutes, including every district.
const trafficScene = new THREE.Scene(), traffic = createTraffic(trafficScene);
const quietPlayer = { target: new THREE.Vector3(750, 0, 600), driving: false, speed: 0 };
let maxRoadDeviation = 0, moving = 0;
const start = traffic.items.map(t => t.root.position.clone());
for (let frame = 0; frame < 7200; frame++) {
  traffic.update(1 / 30, quietPlayer, [], () => {});
  if (frame % 30) continue;
  for (const item of traffic.items) {
    const p = item.root.position;
    const deviation = Math.min(Math.abs(p.x - Math.round(p.x / 100) * 100), Math.abs(p.z - Math.round(p.z / 100) * 100));
    maxRoadDeviation = Math.max(maxRoadDeviation, deviation);
    assert.ok(deviation <= 7.01, 'civilian stays on asphalt, including corners');
    assert.equal(world.blocked(p.x, p.z, .9), false, `civilian never crosses a building or fort wall: ${p.x},${p.z}, parked=${item.parked}`);
  }
}
traffic.items.forEach((item, i) => { if (!item.parked && item.root.position.distanceTo(start[i]) > 2) moving++; });
assert.ok(moving > 200, 'circulation persists; not a static car scene');
assert.ok(traffic.draw(new THREE.Vector3(-300, 0, 0)) <= CAR_RENDER_CAP);
const camera = new THREE.PerspectiveCamera(64, 16 / 9, .1, 400);
camera.position.set(-300, 5, -60); camera.lookAt(-300, 1.5, 30); camera.updateMatrixWorld();
world.animate(1 / 60, camera);
assert.ok(world.population.visibleCars <= world.population.carCap);
assert.ok(world.population.visiblePeople <= world.population.pedestrianCap);

player.reset(518, 98, Math.PI / 2);
const vendor = world.pedestrians.find(p => p.role === 'vendor');
world.raiseWanted(4);
for (let i = 0; i < 60; i++) world.update(1 / 120, player, car);
assert.ok(vendor.flee > 0, 'vendors react to nearby chase');
assert.equal(world.police.length, 3);
assert.ok(world.helicopter);
assert.equal(world.carjack(new THREE.Vector3(521, 0, 94), car), true);
assert.equal(world.thefts, 1);
assert.equal(world.traffic[0].root.visible, false);
world.resetMarketCar();
assert.equal(world.traffic[0].root.visible, true);
world.clearHeat();
assert.equal(world.helicopter, null);
assert.equal(world.police.length, 0);

// CPU-only simulation budget: report it separately from GPU/browser frame times.
const timings = [];
player.reset(-300, -50, 0);
for (let frame = 0; frame < 360; frame++) {
  const now = performance.now();
  for (let tick = 0; tick < 2; tick++) world.update(1 / 120, player, car);
  timings.push(performance.now() - now);
}
timings.sort((a, b) => a - b);
console.log(JSON.stringify({ population: world.population, movingCars: moving, maxRoadDeviation,
  simulation60Hz: { averageMs: timings.reduce((a, b) => a + b) / timings.length, p95Ms: timings[Math.floor(timings.length * .95)] } }, null, 2));
console.log('PASS: bounded dense population, four models/nine paints, four-minute road containment/circulation, camera caps, social roles, fleeing, carjacking, police and helicopter.');
