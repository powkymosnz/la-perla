import * as THREE from '../vendor/three.module.min.js';
import { buildCarModel } from './car-model.js';

export function createCar(scene) {
  const root = new THREE.Group();
  root.name = 'player-car';
  root.position.set(596, 0, -54);
  scene.add(root);
  const { paint: shell, brake, roll } = buildCarModel('sport', root, 0xcf182b);
  const velocity = new THREE.Vector2();
  let heading = 0;
  let steering = 0;
  let tireCondition = 1;
  let engineUpgrade = 0;
  let handlingUpgrade = 0;
  let damage = 0;
  let impactKick = new THREE.Vector2();

  function update(dt, input, world) {
    const throttle = input?.axis('KeyW', 'KeyS') ?? 0;
    const turn = input?.axis('KeyA', 'KeyD') ?? 0;
    const drift = input?.down('Space') ?? false;
    const forward = velocity.x * Math.sin(heading) + velocity.y * Math.cos(heading);
    steering += (turn - steering) * (1 - Math.exp(-12 * dt));
    heading += steering * Math.sign(forward) * Math.min(Math.abs(forward) / 6, 1) *
      (drift ? 2.45 : 1.55) * (1 + handlingUpgrade * .1) * dt;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const longitudinal = velocity.x * fx + velocity.y * fz;
    const lateral = (velocity.x * fz - velocity.y * fx) * Math.exp(-(drift ? 1.35 : 9 + handlingUpgrade * 1.5) * dt);
    const acceleration = throttle > 0 ? (longitudinal < -1 ? 24 : 15) :
      throttle < 0 ? (longitudinal > 1 ? -27 : -8) : 0;
    const speed = THREE.MathUtils.clamp((longitudinal + acceleration * dt) *
      Math.exp(-(drift ? .85 : throttle ? .23 : .85) * dt), -10, (37 + engineUpgrade * 2) * (.35 + tireCondition * .65));
    impactKick.multiplyScalar(Math.exp(-3.5 * dt));
    velocity.set(fx * speed + fz * lateral + impactKick.x, fz * speed - fx * lateral + impactKick.y);
    // Project the body onto the world axes to test against building AABBs.
    const extentX = Math.abs(fz) * 1.18 + Math.abs(fx) * 2.34;
    const extentZ = Math.abs(fx) * 1.18 + Math.abs(fz) * 2.34;
    const { x, z } = root.position;
    const hit = world.move(root.position, velocity.x * dt, velocity.y * dt, extentX, extentZ);
    if (hit.hitX) velocity.x = 0;
    if (hit.hitZ) velocity.y = 0;
    if ((hit.hitX || hit.hitZ) && Math.abs(speed) > 4) damage = Math.min(1, damage + dt * .06);
    root.rotation.y = heading;
    brake.color.setScalar(throttle < 0 || drift ? 2.8 : 1);
    roll((root.position.x - x) * fx + (root.position.z - z) * fz, steering * .32);
  }

  return {
    root, update,
    get heading() { return heading; },
    setHeading(value) { heading = value; root.rotation.y = value; velocity.set(0, 0); },
    setColor(value) { shell.color.setHex(value); },
    extents() {
      const sin = Math.abs(Math.sin(heading)), cos = Math.abs(Math.cos(heading));
      return [cos * 1.18 + sin * 2.34, sin * 1.18 + cos * 2.34];
    },
    bump(dx, dz) { impactKick.x += dx * 6; impactKick.y += dz * 6; damage = Math.min(1, damage + Math.hypot(dx, dz) * .02); },
    configure({ color, upgrades }) { shell.color.setHex(color); engineUpgrade = upgrades.engine; handlingUpgrade = upgrades.handling; },
    repair() { damage = 0; tireCondition = 1; },
    takeDamage(amount) { if (Number.isFinite(amount)) damage = THREE.MathUtils.clamp(damage + Math.max(0, amount), 0, 1); },
    upgrade(kind) { if (kind === 'engine') engineUpgrade = Math.min(3, engineUpgrade + 1); if (kind === 'handling') handlingUpgrade = Math.min(3, handlingUpgrade + 1); },
    damageTires(dt) { tireCondition = Math.max(.08, tireCondition - dt * .42); },
    // Ground speed in world units per second.
    get speed() { return velocity.length(); },
    get gear() {
      const forward = velocity.x * Math.sin(heading) + velocity.y * Math.cos(heading);
      return forward < -.5 ? 'R' : Math.abs(forward) < .5 ? 'N' : String(Math.min(6, 1 + Math.floor(forward * 3.6 / 25)));
    },
    get health() { return 1 - damage; },
  };
}

// Day 5: the player coupe keeps its handling and damage model amid instanced traffic.
