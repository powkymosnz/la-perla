import * as THREE from '../vendor/three.module.min.js';
import { buildCity } from './city.js';
import { buildCoast, SHORE, PIER_Z, PIER_END } from './coast.js';
import { box, paint } from './geometry.js';

const POLICE_BLUE = 0x3156b7;
const trafficColors = [0xe6a34c, 0x3e9ca8, 0x976ab4, 0xdda6a0, 0x5e8dce];

function vehicle(parent, color, police = false) {
  const root = new THREE.Group();
  box(root, color, 0, .62, 0, 1.85, .55, 3.7, true);
  box(root, police ? 0x26324a : color, 0, .94, 0, 1.62, .42, 1.55, true);
  box(root, 0x263044, 0, 1.12, -.2, 1.46, .42, 1.62, true);
  if (police) {
    box(root, 0xf2e8d0, 0, 1.43, 0, .58, .12, .24, true);
    box(root, 0xf05f68, -.35, 1.58, 0, .25, .1, .16);
    box(root, 0x5dc8e0, .35, 1.58, 0, .25, .1, .16);
  }
  parent.add(root);
  return root;
}

function person(parent, color) {
  const root = new THREE.Group();
  box(root, color, 0, .85, 0, .28, .72, .22, true);
  box(root, 0xe8b58e, 0, 1.42, 0, .25, .25, .25, true);
  parent.add(root);
  return root;
}

export function createWorld(scene) {
  const solids = buildCity(scene);
  const animateCoast = buildCoast(scene);
  const traffic = [];
  const pedestrians = [];
  const police = [];
  let helicopter = null;
  let spikeStrip = null;
  let roadblock = null;
  let wanted = 0;
  let heat = 0;
  let heatClock = 0;
  let wantedClock = 0;
  let crimeFlash = 0;
  let cash = 2450;
  let lastCar;

  function addTraffic(x, z, heading, index) {
    const root = vehicle(scene, trafficColors[index % trafficColors.length]);
    root.position.set(x, 0, z);
    root.rotation.y = heading;
    const driver = new THREE.Group();
    box(driver, 0xe0b28c, 0, 1.13, .35, .38, .48, .28);
    box(driver, 0x272939, 0, 1.47, .35, .3, .24, .3);
    root.add(driver);
    traffic.push({ root, color: trafficColors[index % trafficColors.length], heading, speed: 4.5 + (index % 3) * 1.6, flee: 0, wait: index % 4 === 0 ? 1 : 0 });
  }
  // Park the first traffic car beside the starting coupe.
  addTraffic(598, -57, 0, 0);
  traffic[0].wait = 12;
  for (let i = 1; i < 11; i++) {
    const road = [-500, -300, -100, 100, 300, 500][i % 6];
    addTraffic(i % 2 ? road : 600 - (i * 37), i % 2 ? -520 + i * 78 : -260 + i * 82, i % 2 ? 0 : Math.PI / 2, i);
  }
  for (let i = 0; i < 18; i++) {
    const root = person(scene, [0xf19a72, 0x68a9a9, 0xcda65e, 0xd7788b][i % 4]);
    root.position.set(-470 + (i * 83) % 1040, 0, -470 + (i * 137) % 900);
    pedestrians.push({ root, heading: (i % 4) * Math.PI / 2, speed: 1.1 + i % 3 * .35, flee: 0 });
  }

  function blocked(x, z, halfWidth, halfDepth = halfWidth, height = 0) {
    const onPier = x + halfWidth <= PIER_END && Math.abs(z - PIER_Z) + halfDepth < 6.5;
    if (x - halfWidth < -608 || Math.abs(z) + halfDepth > 608 || (x + halfWidth > SHORE && !onPier)) return true;
    return solids.some(solid => height < solid.height && Math.abs(x - solid.x) < halfWidth + solid.w && Math.abs(z - solid.z) < halfDepth + solid.d);
  }
  function move(position, dx, dz, halfWidth, halfDepth = halfWidth) {
    const hitX = blocked(position.x + dx, position.z, halfWidth, halfDepth);
    if (!hitX) position.x += dx;
    const hitZ = blocked(position.x, position.z + dz, halfWidth, halfDepth);
    if (!hitZ) position.z += dz;
    return { hitX, hitZ };
  }
  function raiseWanted(amount = 1, text = 'VEHICLE THEFT') {
    wanted = Math.min(5, Math.max(wanted, amount));
    wantedClock = 0;
    crimeFlash = 2.5;
    for (const ped of pedestrians) ped.flee = 3;
    return text;
  }
  function carjack(position, car) {
    let target = null;
    let distance = 4.6;
    for (const item of traffic) {
      const d = item.root.position.distanceTo(position);
      if (!item.root.visible || d > distance) continue;
      target = item;
      distance = d;
    }
    if (!target) return false;
    car.root.position.copy(target.root.position);
    car.root.rotation.y = target.heading;
    car.setHeading?.(target.heading);
    car.setColor?.(target.color);
    const driver = person(scene, 0xc98161);
    driver.position.set(target.root.position.x - 2.4, 0, target.root.position.z);
    pedestrians.push({ root: driver, heading: Math.PI / 2, speed: 2.7, flee: 5 });
    car.setHeading?.(target.heading);
    target.root.visible = false;
    raiseWanted(2, 'CARJACKING');
    cash += 120;
    heat = 0;
    return true;
  }
  function canCarjack(position) {
    return traffic.some(item => item.root.visible && item.root.position.distanceTo(position) <= 4.6);
  }
  function spawnPolice() {
    while (police.length < Math.min(3, Math.max(1, wanted))) {
      const i = police.length;
      const root = vehicle(scene, POLICE_BLUE, true);
      const a = Math.PI + (i - 1) * .9;
      root.position.set(lastCar.root.position.x + Math.sin(a) * (22 + i * 7), 0, lastCar.root.position.z + Math.cos(a) * (22 + i * 7));
      police.push({ root, index: i, speed: 9 + i * 1.6, heading: a, distance: 0, pit: false });
    }
  }
  function ensureHelicopter() {
    if (helicopter || wanted < 4) return;
    const root = new THREE.Group();
    box(root, 0x303746, 0, 0, 0, 3.6, 1.1, 5.2, true);
    box(root, 0x5b6b7f, 0, .75, 0, 2.2, .7, 2.2, true);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(10, .06, .18), paint(0xe8cfb5));
    rotor.position.y = 1.25;
    root.add(rotor);
    root.position.set(lastCar.root.position.x + 4, 8, lastCar.root.position.z + 5);
    scene.add(root);
    const spotlight = new THREE.Mesh(new THREE.ConeGeometry(3.6, 16, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1bb, transparent: true, opacity: .19, depthWrite: false }));
    spotlight.rotation.x = Math.PI;
    spotlight.position.y = -8;
    root.add(spotlight);
    helicopter = { root, rotor, spotlight };
  }
  function ensureSpikes() {
    if (spikeStrip || wanted < 5) return;
    spikeStrip = new THREE.Group();
    for (let i = -3; i <= 3; i++) box(spikeStrip, 0xd6545e, i * 1.1, .15, 0, .75, .28, .12, true);
    spikeStrip.position.set(lastCar.root.position.x + Math.sin(lastCar.heading) * 24, 0, lastCar.root.position.z + Math.cos(lastCar.heading) * 24);
    spikeStrip.rotation.y = lastCar.heading;
    scene.add(spikeStrip);
  }
  function ensureRoadblock() {
    if (roadblock || wanted < 3) return;
    roadblock = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const unit = vehicle(roadblock, POLICE_BLUE, true);
      unit.position.set(i * 5, 0, 0);
      unit.rotation.y = Math.PI / 2;
    }
    roadblock.position.set(lastCar.root.position.x + Math.sin(lastCar.heading) * 32, 0, lastCar.root.position.z + Math.cos(lastCar.heading) * 32);
    roadblock.rotation.y = lastCar.heading;
    scene.add(roadblock);
  }
  function updateTraffic(dt, player) {
    for (const item of traffic) {
      if (!item.root.visible) continue;
      item.crash = Math.max(0, (item.crash || 0) - dt);
      const speed = item.speed + (item.flee > 0 ? 8 : 0);
      item.wait = Math.max(0, item.wait - dt);
      if (item.wait <= 0 || item.flee > 0) {
        item.root.position.x += Math.sin(item.heading) * speed * dt;
        item.root.position.z += Math.cos(item.heading) * speed * dt;
      }
      if (item.root.position.x > 625) item.root.position.x = -590;
      if (item.root.position.x < -625) item.root.position.x = 590;
      if (item.root.position.z > 590) item.root.position.z = -590;
      if (item.root.position.z < -590) item.root.position.z = 590;
      item.flee = Math.max(0, item.flee - dt);
      const distance = item.root.position.distanceTo(player.target);
      if (player?.driving && distance < 3.8 && player.speed > 10 && item.crash <= 0) {
        item.flee = 5; item.wait = 0; item.crash = 4;
        raiseWanted(1, 'TRAFFIC COLLISION');
      } else if (player?.driving && distance < 7 && player.speed > 10) { item.flee = 4; item.wait = 0; }
      if (Math.random() < dt * .015 && item.flee <= 0) item.wait = 1 + Math.random() * 2.5;
    }
  }
  function update(dt, player, car) {
    lastCar = car;
    updateTraffic(dt, player);
    for (const ped of pedestrians) {
      const speed = ped.speed * (ped.flee > 0 ? 3.1 : 1);
      ped.root.position.x += Math.sin(ped.heading) * speed * dt;
      ped.root.position.z += Math.cos(ped.heading) * speed * dt;
      ped.flee = Math.max(0, ped.flee - dt);
      if (player?.driving && ped.root.position.distanceTo(player.target) < 5 && player.speed > 12) ped.flee = 4;
      if (ped.root.position.x > 590 || ped.root.position.x < -590) ped.heading = Math.PI - ped.heading;
      if (ped.root.position.z > 590 || ped.root.position.z < -590) ped.heading = -ped.heading;
    }
    if (wanted) {
      wantedClock += dt;
      if (wanted < 5 && wantedClock > 4.5) { wanted++; wantedClock = 0; }
      spawnPolice();
      for (const unit of police) {
        const flank = unit.index - (police.length - 1) / 2;
        const sideX = Math.cos(car.heading) * flank * 5;
        const sideZ = -Math.sin(car.heading) * flank * 5;
        const dx = car.root.position.x + sideX - Math.sin(car.heading) * 6 - unit.root.position.x;
        const dz = car.root.position.z + sideZ - Math.cos(car.heading) * 6 - unit.root.position.z;
        const distance = Math.hypot(dx, dz);
        unit.distance = distance;
        const targetHeading = Math.atan2(dx, dz);
        const delta = Math.atan2(Math.sin(targetHeading - unit.heading), Math.cos(targetHeading - unit.heading));
        unit.heading += delta * Math.min(1, dt * 3.2);
        unit.pit = car.speed < 12 && distance < 8;
        const pace = unit.pit ? 3.5 : unit.speed;
        unit.root.position.x += Math.sin(unit.heading) * pace * dt;
        unit.root.position.z += Math.cos(unit.heading) * pace * dt;
        unit.root.rotation.y = unit.heading;
        if (distance < 3.9 && car.speed > 4) car.bump?.(Math.sin(unit.heading) * dt * 8, Math.cos(unit.heading) * dt * 8);
      }
      ensureHelicopter(); ensureSpikes();
      ensureRoadblock();
      if (helicopter) {
        helicopter.root.position.lerp(new THREE.Vector3(car.root.position.x + 4, 8, car.root.position.z + 5), 1 - Math.exp(-dt));
        helicopter.rotor.rotation.y += dt * 12;
      }
      if (spikeStrip && car.root.position.distanceTo(spikeStrip.position) < 8) car.damageTires?.(dt);
      if (wantedClock > 12 && police.every(unit => unit.distance > 48)) { wanted = 0; heat = Math.max(heat, 1); heatClock = 0; wantedClock = 0; }
    }
    if (!wanted && heat > 0) {
      heatClock += dt;
      if (heatClock > 5 && police.some(unit => unit.root.position.distanceTo(car.root.position) < 220)) {
        wanted = 1;
        wantedClock = 0;
        heatClock = 0;
      }
    }
    crimeFlash = Math.max(0, crimeFlash - dt);
  }
  return {
    animate: animateCoast, update, blocked, move, carjack, canCarjack, raiseWanted,
    get wanted() { return wanted; }, get heat() { return heat; }, get crimeFlash() { return crimeFlash; },
    get cash() { return cash; }, get police() { return police; }, get helicopter() { return helicopter; },
    get spikes() { return spikeStrip; }, get traffic() { return traffic; }, get pedestrians() { return pedestrians; },
  };
}
