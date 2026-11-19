import * as THREE from '../vendor/three.module.min.js';
import { batchStaticParts, beam, box, texture } from './geometry.js';
import { palm } from './city.js';
import { createRandom } from './random.js';

export const SHORE = 650;
export const BEACH = 615;
export const PIER_START = 622;
export const WHEEL_X = 680;
export const PIER_Z = 48;
export const PIER_WIDTH = 14;
export const PIER_END = 750;

export function buildCoast(scene) {
  const firstChild = scene.children.length;
  box(scene, 0xc5a994, 613, .09, 0, 6, .18, 1220);
  box(scene, 0xe9bd81, 635, -.19, 0, 40, .36, 1500);
  const random = createRandom(774);
  const waveMap = texture(256, 256, ctx => {
    ctx.fillStyle = '#367d8b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 440; i++) {
      ctx.fillStyle = i % 2 ? '#d4ffe029' : '#25476428';
      ctx.fillRect(random() * 256, random() * 256, .5 + random() * 2, 4 + random() * 40);
    }
  });
  waveMap.wrapS = waveMap.wrapT = THREE.RepeatWrapping;
  waveMap.repeat.set(73, 80);
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1460, 1900), new THREE.MeshLambertMaterial({ map: waveMap }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(SHORE + 730, -.26, 0);
  scene.add(ocean);
  const foam = new THREE.MeshBasicMaterial({ color: 0xffebcd, transparent: true, opacity: .67 });
  for (let z = -730; z < 730; z += 12) {
    box(scene, foam, SHORE + Math.sin(z * .07) * .6, -.18, z, .65, .02, 4 + random() * 9);
  }
  for (let z = -590; z < 600; z += 18) palm(scene, 616 + random() * 4, z, 6 + random() * 4);

  box(scene, 0x936052, 686, -.22, PIER_Z, PIER_END - PIER_START, .44, PIER_WIDTH, true);
  for (let x = PIER_START + 1; x < PIER_END; x += 3) {
    box(scene, x % 2 ? 0xc48f72 : 0xb68067, x, .015, PIER_Z, 2.92, .07, 13.8);
  }
  for (const side of [-1, 1]) {
    const z = PIER_Z + side * 6.75;
    box(scene, 0xe9be96, 685.5, 1.1, z, 128, .14, .19);
    for (let x = 624; x < PIER_END; x += 6) box(scene, 0x956052, x, .1, z, .25, 2.1, .25, true);
  }
  const x = WHEEL_X;
  const y = 20;
  const z = PIER_Z;
  const radius = 16;
  box(scene, 0xa56e57, x, -.15, z, 39, .3, 22, true);
  const wheel = new THREE.Group();
  wheel.position.set(x, y, z);
  scene.add(wheel);
  const v = (a, b, c) => new THREE.Vector3(a, b, c);
  for (const side of [-1, 1]) {
    for (const foot of [-1, 1]) {
      beam(scene, 0xf7cd9b, v(x + foot * 8, 0, z + side * 4), v(x, y, z + side * 1.8), .45, true);
    }
  }
  const lights = new THREE.MeshBasicMaterial({ color: 0xffcf91 });
  const cabins = [];
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    const b = a + Math.PI / 8;
    const px = Math.cos(a) * radius;
    const py = Math.sin(a) * radius;
    for (const side of [-1, 1]) {
      beam(wheel, 0xffd09c, v(px, py, side), v(Math.cos(b) * radius, Math.sin(b) * radius, side), .21);
      beam(wheel, 0xd98b7d, v(px, py, side), v(0, 0, side), .09);
    }
    box(wheel, lights, px, py, 1.14, .53, .53, .24);
    const cabin = new THREE.Group();
    cabin.position.set(px, py, 0);
    wheel.add(cabin);
    const color = [0xcb5876, 0x52a2a7, 0xf4b54f, 0x8175aa][i % 4];
    box(cabin, color, 0, -1.1, 0, 2.1, .65, 2.2);
    box(cabin, color, 0, .05, 0, 2.25, .17, 2.25);
    for (const side of [-1, 1]) box(cabin, 0xffd6ac, side * .9, -.48, 0, .1, 1.05, 1.8);
    batchStaticParts(cabin, cabin.children.slice());
    cabins.push(cabin);
  }
  batchStaticParts(wheel, wheel.children.filter(child => !child.isGroup));
  // Each gondola keeps its pivot so it can counterrotate while the pier stays static.
  batchStaticParts(scene, scene.children.slice(firstChild).filter(child => child !== wheel));
  return dt => {
    wheel.rotation.z += dt * .105;
    for (const cabin of cabins) cabin.rotation.z = -wheel.rotation.z;
    waveMap.offset.x += dt * .022;
  };
}

// Day 5: umbrella bays leave this pier and its animated wheel approach clear.
