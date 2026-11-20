import * as THREE from '../vendor/three.module.min.js';
import { buildCity, LIMIT, STEP } from './city.js';
import { buildCoast, SHORE, PIER_Z, PIER_END } from './coast.js';
import { box, paint, texture } from './geometry.js';
import { createPoliceCar } from './police-car.js';
import { createTraffic } from './traffic.js';
import { createCrowd } from './crowd.js';
import { buildStreetLife } from './street-life.js';

export function createWorld(scene) {
  const solids = buildCity(scene);
  const solidGrid = new Map();
  let solidQuery = 0;
  function indexSolid(solid) {
    solid.queryId = ++solidQuery;
    for (let gx = Math.floor((solid.x - solid.w) / STEP); gx <= Math.floor((solid.x + solid.w) / STEP); gx++) {
      for (let gz = Math.floor((solid.z - solid.d) / STEP); gz <= Math.floor((solid.z + solid.d) / STEP); gz++) {
        const key = `${gx},${gz}`;
        if (!solidGrid.has(key)) solidGrid.set(key, []);
        solidGrid.get(key).push(solid);
      }
    }
  }
  solids.forEach(indexSolid);
  const animateCoast = buildCoast(scene);
  const trafficSystem = createTraffic(scene);
  const traffic = trafficSystem.items;
  const marketCar = trafficSystem.marketCar;
  const crowd = createCrowd(scene, blocked);
  const pedestrians = crowd.items;
  const lifeProps = buildStreetLife(scene, crowd.benches);
  let focus = new THREE.Vector3(596, 0, -54);
  let visibleCars = 0, visiblePeople = 0;
  const police = [];
  let helicopter = null;
  let spikeStrip = null;
  let roadblock = null;
  let wanted = 0;
  let heat = 0;

  let wantedClock = 0, unseen = 0, thefts = 0;
  const lastKnownTarget = new THREE.Vector3();
  let crimeFlash = 0;
  let lastCar;
  const garageSpot = new THREE.Vector3(530, 0, -300);

  function blocked(x, z, halfWidth, halfDepth = halfWidth, height = 0) {
    const onPier = x + halfWidth <= PIER_END && Math.abs(z - PIER_Z) + halfDepth < 6.5;
    if (x - halfWidth < -608 || Math.abs(z) + halfDepth > 608 || (x + halfWidth > SHORE && !onPier)) return true;
    // A building that straddles a grid boundary only needs to be tested once.
    const queryId = ++solidQuery;
    for (let gx = Math.floor((x - halfWidth) / STEP); gx <= Math.floor((x + halfWidth) / STEP); gx++) {
      for (let gz = Math.floor((z - halfDepth) / STEP); gz <= Math.floor((z + halfDepth) / STEP); gz++) {
        for (const solid of solidGrid.get(`${gx},${gz}`) ?? []) {
          if (solid.queryId === queryId) continue;
          solid.queryId = queryId;
          if (height < solid.height && Math.abs(x - solid.x) < halfWidth + solid.w &&
            Math.abs(z - solid.z) < halfDepth + solid.d) return true;
        }
      }
    }
    return false;
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
    // Driver extraction shares the bounded crowd pool, so repeated thefts cannot leak meshes.
    const driver = crowd.add(target.root.position.x - 2.4, target.root.position.z, 'chat', Math.PI / 2);
    if (driver) driver.flee = 5;
    car.setHeading?.(target.heading);
    target.root.visible = false;
    raiseWanted(2, 'CARJACKING');
    thefts++;
    heat = 0;
    return true;
  }
  function canCarjack(position) {
    return traffic.some(item => item.root.visible && item.root.position.distanceTo(position) <= 4.6);
  }
  function spawnPolice(target) {
    while (police.length < Math.min(3, Math.max(1, wanted))) {
      const i = police.length;
      const model = createPoliceCar(scene);
      const root = model.root;
      const x = road(target.x);
      const z = road(target.z);
      const offset = (z > target.z ? 1 : -1) * (22 + i * 8);
      const heading = offset > 0 ? Math.PI : 0;
      root.position.set(x, 0, THREE.MathUtils.clamp(z + offset, -LIMIT, LIMIT));
      police.push({ name: ['TARPON-11', 'MARLIN-3', 'GULL-1'][i], root, model, speed: 16 + i * 2, heading, distance: Infinity, contact: 0 });
    }
  }
  function ensureHelicopter() {
    if (helicopter || wanted < 4) return;
    const root = new THREE.Group();
    const fuselage = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), paint(0x303746));
    fuselage.scale.set(1.75, .88, 2.6); fuselage.castShadow = true; root.add(fuselage);
    const cockpit = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), paint(0x5b8b9a));
    cockpit.position.set(0, .26, 1.15); cockpit.scale.set(1.5, .7, 1.4); root.add(cockpit);
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(10, .06, .18), paint(0xe8cfb5));
    rotor.position.y = 1.25;
    root.add(rotor);
    box(rotor, 0xd5c3a8, 0, 0, 0, .18, .06, 10);
    box(root, 0x436877, 0, .12, 2.55, 2.9, .8, .16, true);
    box(root, 0x303746, 0, .1, -4.1, .48, .44, 4.5, true);
    box(root, 0x435365, 0, .9, -6.1, .2, 1.8, 1.1, true);
    for (const side of [-1, 1]) {
      box(root, 0xb6b5b4, side * 1.35, -.95, 0, .15, .15, 5.5);
      box(root, 0x303746, side * 1.35, -.55, 0, .12, .8, .12);
    }
    root.position.set(lastCar.root.position.x + 8, 10, lastCar.root.position.z + 28);
    scene.add(root);
    const spotlight = new THREE.Mesh(new THREE.ConeGeometry(4, 10, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff1bb, transparent: true, opacity: .19, depthWrite: false }));
    spotlight.position.y = -5;
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
    roadblock.userData.models = [];
    for (let i = -1; i <= 1; i++) {
      const model = createPoliceCar(roadblock);
      roadblock.userData.models.push(model);
      const unit = model.root;
      unit.position.set(i * 5, 0, 0);
      unit.rotation.y = Math.PI / 2;
    }
    roadblock.position.set(lastCar.root.position.x + Math.sin(lastCar.heading) * 32, 0, lastCar.root.position.z + Math.cos(lastCar.heading) * 32);
    roadblock.rotation.y = lastCar.heading;
    scene.add(roadblock);
  }
  function update(dt, player, car) {
    lastCar = car;
    focus = player.target;
    trafficSystem.update(dt, player, police, raiseWanted);
    crowd.update(dt, player, wanted, move);
    if (wanted) {
      wantedClock += dt;
      if (!unseen) lastKnownTarget.copy(player.target);
      const chaseTarget = unseen > 0 ? lastKnownTarget : player.target;
      spawnPolice(chaseTarget);
      for (const unit of police) {
        unit.contact = Math.max(0, unit.contact - dt);
        const position = unit.root.position;
        unit.distance = position.distanceTo(player.target);
        const x = road(position.x), z = road(position.z);
        const targetX = road(chaseTarget.x), targetZ = road(chaseTarget.z);
        if (!unit.next || position.distanceTo(unit.next) < .2) {
          if (unit.next) position.copy(unit.next);
          const intersection = Math.abs(position.x - x) < .3 && Math.abs(position.z - z) < .3;
          let nextX = x, nextZ = z;
          if (intersection) {
            if (targetX !== x) nextX += Math.sign(targetX - x) * STEP;
            else if (targetZ !== z) nextZ += Math.sign(targetZ - z) * STEP;
            else if (Math.abs(chaseTarget.x - x) > Math.abs(chaseTarget.z - z))
              nextX = THREE.MathUtils.clamp(chaseTarget.x, -LIMIT, LIMIT);
            else nextZ = THREE.MathUtils.clamp(chaseTarget.z, -LIMIT, LIMIT);
          } else if (Math.abs(position.x - x) < 1) {
            const edge = position.z < z ? z - STEP : z + STEP;
            nextZ = targetZ === edge ? edge : z;
            if (targetX === x && (chaseTarget.z - z) * (edge - chaseTarget.z) > 0) nextZ = THREE.MathUtils.clamp(chaseTarget.z, -LIMIT, LIMIT);
          } else {
            const edge = position.x < x ? x - STEP : x + STEP;
            nextX = targetX === edge ? edge : x;
            if (targetZ === z && (chaseTarget.x - x) * (edge - chaseTarget.x) > 0) nextX = THREE.MathUtils.clamp(chaseTarget.x, -LIMIT, LIMIT);
          }
          unit.next = new THREE.Vector3(nextX, 0, nextZ);
        }
        const delta = unit.next.clone().sub(position);
        if (delta.lengthSq() > .02 && !unit.contact) {
          const heading = Math.atan2(delta.x, delta.z);
          const turn = Math.atan2(Math.sin(heading - unit.heading), Math.cos(heading - unit.heading));
          unit.heading += turn * Math.min(1, dt * 9);
          delta.clampLength(0, unit.speed * dt);
          const next = position.clone().add(delta);
          if (!blocked(next.x, next.z, 1.2)) {
            position.copy(next);
            unit.model.roll(delta.length(), THREE.MathUtils.clamp(turn, -.32, .32));
          }
        }
        unit.root.rotation.y = unit.heading;
        unit.model.flash(performance.now() / 1000);
      }
      for (let pass = 0; pass < 4; pass++) {
        for (let i = 0; i < police.length; i++) {
          const unit = police[i];
          separate(unit, car, 5.3, dt);
          for (let j = 0; j < i; j++) separate(unit, police[j], 5.15, dt);
        }
      }
      const obscured = unit => {
        if (unit.distance > (wanted >= 4 ? 35 : 45)) return true;
        const from = unit.root.position;
        for (let t = .12; t < .9; t += .12) {
          if (blocked(from.x + (player.target.x - from.x) * t, from.z + (player.target.z - from.z) * t, .1, .1, 1.6)) return true;
        }
        return false;
      };
      let airSpotted = false;
      if (helicopter) {
        const from = helicopter.root.position;
        airSpotted = Math.hypot(from.x - player.target.x, from.z - player.target.z) < 35;
        for (let t = .12; airSpotted && t < .94; t += .12) {
          if (blocked(from.x + (player.target.x - from.x) * t, from.z + (player.target.z - from.z) * t, .1, .1, from.y * (1 - t) + 1.2 * t)) airSpotted = false;
        }
      }
      unseen = police.every(obscured) && !airSpotted ? unseen + dt : 0;
      if (wantedClock > 25 && unseen === 0 && wanted < 5) { wanted++; wantedClock = 0; }
      ensureHelicopter(); ensureSpikes();
      ensureRoadblock();
      roadblock?.updateMatrixWorld(true);
      const parked = (roadblock?.userData.models ?? []).map(model => ({
        model, root: { position: model.root.getWorldPosition(new THREE.Vector3()) },
      }));
      for (let pass = 0; pass < 5; pass++) {
        for (let i = 0; i < parked.length; i++) {
          const block = parked[i];
          separate(block, car, 5.3, dt);
          for (const unit of police) separate(unit, block, 5.15, dt);
          for (let j = 0; j < i; j++) separate(block, parked[j], 5.15, dt);
        }
        for (const unit of police) separate(unit, car, 5.3, dt);
      }
      for (const { model, root } of parked) {
        model.flash(performance.now() / 1000);
        model.root.position.copy(roadblock.worldToLocal(root.position));
      }
      if (helicopter) {
        helicopter.root.position.lerp(new THREE.Vector3(player.target.x + 8, 10, player.target.z + 28), 1 - Math.exp(-dt * .42));
        helicopter.rotor.rotation.y += dt * 12;
      }
      if (spikeStrip && car.root.position.distanceTo(spikeStrip.position) < 8) car.damageTires?.(dt);
      if (unseen > 4) { clearHeat(); heat = 1; }
    }
    crimeFlash = Math.max(0, crimeFlash - dt);
  }
  function separate(unit, other, reach, dt) {
    const a = unit.root.position, b = other.root.position;
    const dx = b.x - a.x, dz = b.z - a.z;
    const distance = Math.hypot(dx, dz);
    if (distance >= reach) return;
    const nx = distance > .001 ? dx / distance : 0;
    const nz = distance > .001 ? dz / distance : 1;
    const push = (reach - distance + .02) * .5;
    const ax = a.x, az = a.z, bx = b.x, bz = b.z;
    move(a, -nx * push, -nz * push, 1.2);
    const ext = other.extents?.() ?? [1.2, 1.2];
    move(b, nx * push, nz * push, ...ext);
    if (Math.hypot(b.x - a.x, b.z - a.z) < reach) {
      move(a, -nx * push, -nz * push, 1.2);
      if (Math.hypot(b.x - a.x, b.z - a.z) < reach) move(b, nx * push, nz * push, ...ext);
    }
    unit.contact = .35;
    if (other.bump && (bx !== b.x || bz !== b.z)) other.bump(nx * dt * 4, nz * dt * 4);
    if (ax !== a.x || az !== a.z) unit.next = null;
  }
  function clearHeat() {
    for (const unit of police) scene.remove(unit.root);
    if (helicopter) scene.remove(helicopter.root);
    if (roadblock) scene.remove(roadblock);
    if (spikeStrip) scene.remove(spikeStrip);
    helicopter = roadblock = spikeStrip = null;
    police.length = 0;
    heat = wanted = wantedClock = unseen = 0;
  }
  const garage = new THREE.Group();
  garage.name = 'rosa-garage';
  box(garage, 0x744e45, 0, 2, 0, 26, 4, 16, true);
  box(garage, 0x292b3b, 0, 1.3, 8.1, 18, 2.6, .3, true);
  box(garage, 0xe9bd81, 0, 4.1, 0, 28, .25, 18);
  scene.add(garage);
  garage.position.copy(garageSpot).z -= 14;
  solids.push({ x: garage.position.x, z: garage.position.z, w: 13, d: 8, height: 4.25 });
  indexSolid(solids[solids.length - 1]);
  const signMap = texture(256, 48, ctx => {
    ctx.fillStyle = '#292b3b'; ctx.fillRect(0, 0, 256, 48);
    ctx.fillStyle = '#ffe0a2'; ctx.textAlign = 'center'; ctx.font = 'bold 26px sans-serif';
    ctx.fillText('ROSA · GARAJE', 128, 34);
  });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(17, 3.1), new THREE.MeshBasicMaterial({ map: signMap }));
  sign.position.set(0, 3.1, 8.3);
  garage.add(sign);
  return {
    animate(dt, camera) {
      animateCoast(dt);
      visibleCars = trafficSystem.draw(focus, camera);
      visiblePeople = crowd.draw(focus, camera);
    }, update, blocked, move, carjack, canCarjack, raiseWanted,
    get population() { return { cars: traffic.length, pedestrians: pedestrians.length, visibleCars, visiblePeople,
      carCap: trafficSystem.cap, pedestrianCap: crowd.cap, ...lifeProps }; },
    get wanted() { return wanted; }, get heat() { return heat; }, get crimeFlash() { return crimeFlash; },
    get thefts() { return thefts; }, get unseen() { return unseen; },
get police() { return police; }, get helicopter() { return helicopter; },
    get roadblock() { return roadblock; },
    get spikes() { return spikeStrip; }, get traffic() { return traffic; }, get pedestrians() { return pedestrians; },
    get garagePosition() { return garageSpot; }, nearGarage(position) { return position.distanceTo(garageSpot) < 22; },
    resetMarketCar() {
      marketCar.root.visible = true;
      marketCar.root.position.set(521, 0, 94);
      marketCar.wait = Infinity;
      marketCar.flee = 0;
    },
    clearHeat,
  };
}

const road = value => THREE.MathUtils.clamp(Math.round(value / STEP) * STEP, -LIMIT, LIMIT);
