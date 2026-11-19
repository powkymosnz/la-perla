import * as THREE from '../vendor/three.module.min.js';
import { box } from './geometry.js';

export function createPlayer(scene, car) {
  const root = new THREE.Group();
  root.name = 'diego';
  scene.add(root);
  box(root, 0xf2b47c, 0, 1.64, 0, .31, .35, .31, true);
  box(root, 0x332631, 0, 1.8, -.025, .326, .14, .335, true);
  box(root, 0x37a4a3, 0, 1.22, 0, .59, .54, .3, true);
  box(root, 0x303854, 0, .9, 0, .49, .21, .28, true);
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    const leg = new THREE.Group();
    arm.position.set(side * .37, 1.45, 0);
    leg.position.set(side * .14, .87, 0);
    root.add(arm, leg);
    box(arm, 0x37a4a3, 0, -.12, 0, .17, .25, .2, true);
    box(arm, 0xd4946b, 0, -.33, 0, .145, .24, .15, true);
    box(leg, 0x303854, 0, -.35, 0, .21, .71, .24, true);
    box(leg, 0xe8d5ba, 0, -.78, .05, .23, .18, .34, true);
    limbs.push({ arm, leg, side });
  }
  let driving = true;
  let facing = 0;
  let cameraHeading = 0;
  let stride = 0;
  let carjackTimer = 0; // Delay entry while the driver leaves.
  root.visible = false;

  function update(dt, input, world) {
    if (input.take('KeyE')) {
      if (driving && car.speed < 5) {
        for (const side of [1, -1]) {
          const x = car.root.position.x + Math.cos(car.heading) * 1.85 * side;
          const z = car.root.position.z - Math.sin(car.heading) * 1.85 * side;
          if (world.blocked(x, z, .32)) continue;
          root.position.set(x, 0, z);
          facing = cameraHeading = car.heading;
          root.rotation.y = facing;
          driving = false;
          break;
        }
      } else if (!driving && world.carjack(root.position, car)) {
        carjackTimer = 1.8;
        root.position.set(car.root.position.x + 2.25, 0, car.root.position.z + .4);
      } else if (!driving && root.position.distanceTo(car.root.position) < 3.1) {
        driving = true;
      }
    }
    root.visible = !driving;
    car.update(dt, driving ? input : null, world);
    if (driving) return;
    if (carjackTimer > 0) {
      carjackTimer = Math.max(0, carjackTimer - dt);
      if (carjackTimer === 0) driving = true;
      return;
    }

    const turn = input.axis('KeyA', 'KeyD');
    const direction = input.axis('KeyW', 'KeyS');
    const running = input.down('ShiftLeft') || input.down('ShiftRight');
    const step = (running ? 7.4 : 3.6) * dt;
    const angle = cameraHeading + Math.atan2(turn, direction);
    if (turn || direction) {
      const dx = Math.sin(angle) * step;
      const dz = Math.cos(angle) * step;
      // Keep Diego outside the parked car while letting him approach the doors.
      const rx = root.position.x + dx - car.root.position.x;
      const rz = root.position.z + dz - car.root.position.z;
      if (Math.abs(rx * Math.cos(car.heading) - rz * Math.sin(car.heading)) > 1.37 ||
          Math.abs(rx * Math.sin(car.heading) + rz * Math.cos(car.heading)) > 2.55) {
        world.move(root.position, dx, dz, .32);
      }
      const delta = Math.atan2(Math.sin(angle - facing), Math.cos(angle - facing));
      facing += delta * (1 - Math.exp(-15 * dt));
      stride += dt * (running ? 14 : 9);
    }
    root.rotation.y = facing;
    for (const { arm, leg, side } of limbs) {
      const swing = turn || direction ? Math.sin(stride) * side * (running ? .85 : .48) : 0;
      leg.rotation.x = swing;
      arm.rotation.x = -swing * .75;
    }
  }

  return {
    update,
    get target() { return driving ? car.root.position : root.position; },
    get heading() { return driving ? car.heading : cameraHeading; },
    get driving() { return driving; },
    get carjacking() { return carjackTimer > 0; },
  };
}
