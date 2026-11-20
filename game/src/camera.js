import * as THREE from '../vendor/three.module.min.js';

// Camera presets share one collision-safe follow rig. Offsets are expressed in the
// car's forward/right basis so every angle remains useful after a turn.
export const CAMERA_PRESETS = Object.freeze({
  chase: Object.freeze({ label: 'CHASE', forward: -7.1, speedReach: -1.4, side: 1.15, height: 3.9, speedRise: .4, lead: .4, speedLead: .3, aimHeight: 1.15 }),
  hood: Object.freeze({ label: 'HOOD / FIRST PERSON', forward: .95, side: 0, height: 1.52, lead: 15, aimHeight: 1.1 }),
  side: Object.freeze({ label: 'SIDE TRACKING', forward: -1.5, side: 8, height: 2.8, lead: 0, speedLead: 0, aimHeight: 1.1 }),
  lowFront: Object.freeze({ label: 'LOW FRONT 3/4', forward: 6.7, side: 4.2, height: 1.18, lead: 0, aimHeight: 1.05 }),
  highWide: Object.freeze({ label: 'HIGH WIDE', forward: -23, side: 11, height: 22, lead: 1.8, aimHeight: 5.5 }),
});

const MODES = Object.freeze(Object.keys(CAMERA_PRESETS));
const FOOT = { forward: -5.3, side: 0, height: 3.35, lead: 3, aimHeight: 1.75 };
const CLEARANCE = .42;

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(59, 1, .09, 1750);
  const look = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const alternate = new THREE.Vector3();
  const settled = new THREE.Vector3();
  const lastTarget = new THREE.Vector3();
  let heading = 0;
  let ready = false;
  let lead = 0;
  let modeIndex = 0;
  let wasDriving;

  function setMode(mode) {
    const next = typeof mode === 'number' ? MODES[mode] : mode;
    const index = MODES.indexOf(next);
    if (index < 0) throw new RangeError('Unknown camera preset: ' + mode);
    modeIndex = index;
    ready = false;
    return next;
  }
  function cycle() { return setMode((modeIndex + 1) % MODES.length); }

  function follow(dt, player, car, world, shakeX = 0, shakeY = 0) {
    const target = player.target;
    const preset = player.driving ? CAMERA_PRESETS[MODES[modeIndex]] : FOOT;
    if (ready && (wasDriving !== player.driving || lastTarget.distanceToSquared(target) > 3600)) ready = false;
    lastTarget.copy(target);
    wasDriving = player.driving;
    const delta = player.heading - heading;
    const speed01 = player.driving ? THREE.MathUtils.clamp(car.speed / 24, 0, 1) : 0;
    const turnRate = 5.5 + speed01 * 2.5;
    const hood = preset === CAMERA_PRESETS.hood;
    heading += Math.atan2(Math.sin(delta), Math.cos(delta)) * (ready && !hood ? 1 - Math.exp(-turnRate * dt) : 1);
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const rightX = fz, rightZ = -fx;
    const motionLead = preset.lead + speed01 * (preset.speedLead ?? 0);
    lead = ready ? lead + (motionLead - lead) * (1 - Math.exp(-4.5 * dt)) : motionLead;
    const reach = preset.forward + speed01 * (preset.speedReach ?? 0);
    const height = preset.height + speed01 * (preset.speedRise ?? 0);
    const pivotY = target.y + 1.55;
    function offset(position, side, rise) {
      position.set(target.x + fx * reach + rightX * side, target.y + height + rise,
        target.z + fz * reach + rightZ * side);
    }
    offset(desired, preset.side, 0);
    focus.set(target.x + fx * lead, target.y + preset.aimHeight, target.z + fz * lead);
    function available(position) {
      const dx = position.x - target.x, dz = position.z - target.z;
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .7));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const y = THREE.MathUtils.lerp(pivotY, position.y, t);
        if (world.blocked(target.x + dx * t, target.z + dz * t, CLEARANCE, CLEARANCE, y - CLEARANCE)) {
          return (i - 1) / steps;
        }
      }
      return 1;
    }
    let room = available(desired);
    if (room < .85 && !hood) {
      for (const [side, rise] of [[-preset.side, 0], [preset.side * .55, 2], [0, 4]]) {
        offset(alternate, side, rise);
        const free = available(alternate);
        if (free > room) { room = free; desired.copy(alternate); }
        if (room === 1) break;
      }
    }
    desired.x = THREE.MathUtils.lerp(target.x, desired.x, room);
    desired.y = THREE.MathUtils.lerp(pivotY, desired.y, room);
    desired.z = THREE.MathUtils.lerp(target.z, desired.z, room);
    const blend = ready && !hood ? 1 - Math.exp(-(preset === CAMERA_PRESETS.highWide ? 5.5 : 7) * dt) : 1;
    settled.lerp(desired, blend);
    if (available(settled) < 1) settled.copy(desired);
    camera.position.copy(settled);
    camera.position.x += shakeX * (hood ? .25 : 1);
    camera.position.y = Math.max(.68, camera.position.y + shakeY * (hood ? .25 : 1));
    if ((shakeX || shakeY) && available(camera.position) < 1) camera.position.copy(settled);
    look.lerp(focus, blend);
    camera.lookAt(look);
    ready = true;
  }

  return {
    camera,
    follow,
    modes: MODES,
    presets: CAMERA_PRESETS,
    setMode,
    cycle,
    get mode() { return MODES[modeIndex]; },
    get modeName() { return CAMERA_PRESETS[MODES[modeIndex]].label; },
  };
}

// Day 10: five playable views share the same collision-safe, smoothed follow behavior.
