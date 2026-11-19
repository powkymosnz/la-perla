import * as THREE from '../vendor/three.module.min.js';
import { box, paint } from './geometry.js';

export function createCar(scene) {
  const root = new THREE.Group();
  root.name = 'player-car';
  root.position.set(596, 0, -54);
  scene.add(root);
  const shell = new THREE.MeshStandardMaterial({ color: 0xda4f3e, metalness: .25, roughness: .31 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x33475f, metalness: .36, roughness: .24 });
  box(root, shell, 0, .73, 0, 2.24, .69, 4.62, true);
  box(root, shell, 0, .98, 1.33, 2.1, .18, 1.75, true);
  box(root, glass, 0, 1.27, -.27, 1.83, .71, 2.24, true);
  box(root, shell, 0, 1.66, -.34, 1.85, .11, 1.74, true);
  box(root, 0x332838, 0, .5, -2.31, 2.19, .19, .12);
  box(root, 0x332838, 0, .5, 2.31, 2.19, .19, .12);
  box(root, 0xffe6b6, 0, .64, -2.326, .42, .19, .05);

  const tires = new THREE.CylinderGeometry(.4, .4, .32, 14);
  const hubs = new THREE.CylinderGeometry(.24, .24, .34, 10);
  const wheels = [];
  const tail = new THREE.MeshStandardMaterial({ color: 0xff474f, emissive: 0xcb1633, emissiveIntensity: .75 });
  for (const side of [-1, 1]) {
    box(root, tail, side * .74, .88, -2.33, .53, .16, .06);
    box(root, 0xffe9b9, side * .78, .87, 2.33, .48, .19, .06);
    box(root, shell, side * 1.07, 1.27, .42, .3, .16, .24);
    for (const axle of [-1, 1]) {
      const mount = new THREE.Group();
      const wheel = new THREE.Group();
      mount.position.set(side * 1.04, .41, axle * 1.45);
      for (const [shape, color] of [[tires, 0x241f2b], [hubs, 0x9c98a8]]) {
        const mesh = new THREE.Mesh(shape, paint(color));
        mesh.rotation.z = Math.PI / 2;
        mesh.castShadow = true;
        wheel.add(mesh);
      }
      mount.add(wheel);
      root.add(mount);
      wheels.push({ mount, wheel, front: axle > 0 });
    }
  }
  const velocity = new THREE.Vector2();
  let heading = 0;
  let steering = 0;
  let tireCondition = 1;

  function update(dt, input, world) {
    const throttle = input?.axis('KeyW', 'KeyS') ?? 0;
    const turn = input?.axis('KeyA', 'KeyD') ?? 0;
    const drift = input?.down('Space') ?? false;
    const forward = velocity.x * Math.sin(heading) + velocity.y * Math.cos(heading);
    steering += (turn - steering) * (1 - Math.exp(-12 * dt));
    heading += steering * Math.sign(forward) * Math.min(Math.abs(forward) / 6, 1) *
      (drift ? 2.45 : 1.55) * dt;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const longitudinal = velocity.x * fx + velocity.y * fz;
    const lateral = (velocity.x * fz - velocity.y * fx) * Math.exp(-(drift ? 1.35 : 9) * dt);
    const acceleration = throttle > 0 ? (longitudinal < -1 ? 24 : 15) :
      throttle < 0 ? (longitudinal > 1 ? -27 : -8) : 0;
    const speed = THREE.MathUtils.clamp((longitudinal + acceleration * dt) *
      Math.exp(-(drift ? .85 : throttle ? .23 : .85) * dt), -10, 37 * (.35 + tireCondition * .65));
    velocity.set(fx * speed + fz * lateral, fz * speed - fx * lateral);
    // Project the body onto the world axes to test against building AABBs.
    const extentX = Math.abs(fz) * 1.18 + Math.abs(fx) * 2.34;
    const extentZ = Math.abs(fx) * 1.18 + Math.abs(fz) * 2.34;
    const hit = world.move(root.position, velocity.x * dt, velocity.y * dt, extentX, extentZ);
    if (hit.hitX) velocity.x = 0;
    if (hit.hitZ) velocity.y = 0;
    root.rotation.y = heading;
    tail.emissiveIntensity = throttle < 0 || drift ? 2.8 : .75;
    for (const { mount, wheel, front } of wheels) {
      if (front) mount.rotation.y = steering * .32;
      wheel.rotation.x += (hit.hitX && hit.hitZ ? 0 : speed) * dt / .4;
    }
  }

  return {
    root, update,
    get heading() { return heading; },
    setHeading(value) { heading = value; root.rotation.y = value; velocity.set(0, 0); },
    setColor(value) { shell.color.setHex(value); },
    bump(dx, dz) { root.position.x += dx; root.position.z += dz; },
    damageTires(dt) { tireCondition = Math.max(.08, tireCondition - dt * .42); },
    // Ground speed in world units per second.
    get speed() { return velocity.length(); },
  };
}
