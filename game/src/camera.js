import * as THREE from '../vendor/three.module.min.js';

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(64, 1, .12, 1750);
  const look = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const focus = new THREE.Vector3();
  let heading = 0;
  let ready = false;

  function follow(dt, player, car, world) {
    const target = player.target;
    const delta = player.heading - heading;
    heading += Math.atan2(Math.sin(delta), Math.cos(delta)) * (ready ? 1 - Math.exp(-6 * dt) : 1);
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const reach = player.driving ? 9.5 + car.speed * .065 : 5.3;
    const height = player.driving ? 4.55 : 3.35;
    const lead = player.driving ? 7.5 : 3;
    desired.set(target.x - fx * reach, height, target.z - fz * reach);
    focus.set(target.x + fx * lead, player.driving ? 1.55 : 1.75, target.z + fz * lead);
    for (let t = .2; t <= 1.01; t += .1) {
      const x = THREE.MathUtils.lerp(target.x, desired.x, t);
      const z = THREE.MathUtils.lerp(target.z, desired.z, t);
      if (!world.blocked(x, z, .36, .36, height)) continue;
      desired.x = THREE.MathUtils.lerp(target.x, desired.x, t - .12);
      desired.z = THREE.MathUtils.lerp(target.z, desired.z, t - .12);
      break;
    }
    const blend = ready ? 1 - Math.exp(-7 * dt) : 1;
    camera.position.lerp(desired, blend);
    if (world.blocked(camera.position.x, camera.position.z, .28, .28, camera.position.y)) {
      camera.position.copy(desired);
    }
    look.lerp(focus, blend);
    camera.lookAt(look);
    ready = true;
  }

  return { camera, follow };
}
