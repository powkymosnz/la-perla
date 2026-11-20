import { box } from './geometry.js';
// The street collision grid also supplies the sightline checks for attacks.

export const WEAPONS = [
  { name: 'Fists', ammo: Infinity, reach: 2.5, delay: .42 },
  { name: 'Pistol', ammo: 72, reach: 42, delay: .26 },
  { name: 'SMG', ammo: 150, reach: 35, delay: .09 },
  { name: 'Shotgun', ammo: 24, reach: 19, delay: .7 },
  { name: 'Carbine', ammo: 90, reach: 65, delay: .18 },
];

export function createCombat(scene, world, audio) {
  let cooldown = 0, weapon = 1;
  let rounds = WEAPONS.map(slot => slot.ammo);
  const traces = [];
  function update(dt, player, input) {
    cooldown = Math.max(0, cooldown - dt);
    for (let i = traces.length - 1; i >= 0; i--) {
      traces[i].life -= dt;
      if (traces[i].life <= 0) scene.remove(traces.splice(i, 1)[0].mesh);
    }
    for (let slot = 1; slot <= WEAPONS.length; slot++) {
      if (input.take('Digit' + slot)) weapon = slot;
    }
    if (!input.take('KeyF') || cooldown || player.driving || player.carjacking) return null;
    const spec = WEAPONS[weapon - 1];
    const ranged = weapon > 1;
    if (!rounds[weapon - 1]) return null;
    if (ranged) rounds[weapon - 1]--;
    const reach = spec.reach;
    cooldown = spec.delay;
    const { x, z } = player.target;
    const dx = Math.sin(player.aim), dz = Math.cos(player.aim);
    let stop = reach;
    for (let t = .5; t < stop; t += .5) {
      if (world.blocked(x + dx * t, z + dz * t, .05, .05, 1)) stop = t;
    }
    let hit;
    for (const ped of world.pedestrians) {
      const px = ped.root.position.x - x, pz = ped.root.position.z - z;
      const front = px * dx + pz * dz;
      const width = weapon === 4 ? .8 + front * .08 : ranged ? .8 : 1.15;
      if (front < 0 || front > stop || Math.abs(px * dz - pz * dx) > width) continue;
      stop = front;
      hit = ped;
    }
    if (ranged) {
      const mesh = box(scene, 0xffd76f, x + dx * stop / 2, 1.25, z + dz * stop / 2, .045, .045, Math.max(.1, stop));
      mesh.rotation.y = player.aim;
      traces.push({ mesh, life: .07 });
    }
    if (hit) {
      world.move(hit.root.position, dx * 1.25, dz * 1.25, .25);
      hit.heading = player.aim;
      hit.flee = 5;
    }
    if (ranged || hit) world.raiseWanted(ranged ? 2 : 1, ranged ? 'GUNFIRE' : 'ASSAULT');
    audio.effect(ranged ? 'shot' : hit ? 'hit' : 'swing');
    return { shake: hit ? .8 : ranged ? .45 : .12, hitStop: hit ? .065 : 0 };
  }
  return {
    update,
    reset() { rounds = WEAPONS.map(slot => slot.ammo); weapon = 1; cooldown = 0; },
    get active() { return weapon; },
    get slots() { return WEAPONS.map((slot, i) => ({ name: slot.name, ammo: rounds[i] })); },
    get label() { return WEAPONS[weapon - 1].name + (rounds[weapon - 1] ? '' : ' · EMPTY'); },
  };
}

// Day 5: instanced crowd proxies retain these same target, knockback and flee fields.
