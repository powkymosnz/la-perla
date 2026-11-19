import * as THREE from '../vendor/three.module.min.js';
import { createRandom } from './random.js';
import { beam, box, paint, texture } from './geometry.js';

const STEP = 100;
const BLOCK = 80;
const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffd198 });
const LIMIT = 600;
const palettes = [
  ['#eab68e', '#a86f69', '#496471'], ['#edcfa9', '#bc856f', '#567585'],
  ['#80b5ad', '#587f88', '#334b69'], ['#e2a3a0', '#9c6680', '#5e4a71'],
  ['#e3b779', '#ab7756', '#586b79'], ['#a4b7d0', '#617796', '#3c5273'],
];

function facades() {
  return palettes.map(([wall, trim, glass], index) => {
    const random = createRandom(36 + index);
    const map = texture(128, 256, ctx => {
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, 128, 256);
      for (let y = 4; y < 252; y += 32) {
        ctx.fillStyle = trim;
        ctx.fillRect(0, y + 24, 128, 3);
        for (let x = 7; x < 128; x += 32) {
          ctx.fillStyle = trim;
          ctx.fillRect(x - 2, y - 1, 22, 23);
          ctx.fillStyle = random() < .13 ? '#ffd992' : glass;
          ctx.fillRect(x, y, 18, 19);
          ctx.fillStyle = '#ffffff38';
          ctx.fillRect(x, y + 2, 18, 5);
          ctx.fillRect(x + 8, y, 2, 19);
        }
      }
    });
    const side = new THREE.MeshStandardMaterial({ map });
    return [side, side, paint(trim), paint(trim), side, side];
  });
}

const palmLeaf = new THREE.BufferGeometry();
palmLeaf.setAttribute('position', new THREE.Float32BufferAttribute([
  0, 0, 0, 1.7, -.15, -.55, 1.6, .28, 0,
  1.6, .28, 0, 1.7, -.15, -.55, 3.5, -.9, 0,
  0, 0, 0, 1.6, .28, 0, 1.7, -.15, .55,
  1.6, .28, 0, 3.5, -.9, 0, 1.7, -.15, .55,
], 3));
palmLeaf.computeVertexNormals();
const leaves = [0x417b50, 0x638e48].map(color => new THREE.MeshStandardMaterial({
  color, side: THREE.DoubleSide,
}));

export function palm(parent, x, z, height) {
  const base = new THREE.Vector3(x, 0, z);
  const bend = new THREE.Vector3(x + .35, height * .56, z);
  const crown = new THREE.Vector3(x + 1, height, z + .25);
  beam(parent, 0x90624e, base, bend, .27, true);
  beam(parent, 0xaa7e5d, bend, crown, .2, true);
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(palmLeaf, leaves[i % 2]);
    leaf.position.copy(crown);
    leaf.rotation.y = i * Math.PI * 2 / 7 + x;
    leaf.rotation.z = .12 * (i % 3);
    leaf.scale.setScalar(height / 7);
    leaf.castShadow = true;
    parent.add(leaf);
  }
}

function lamp(parent, x, z, side) {
  box(parent, 0x384155, x, 2.5, z, .16, 5, .16);
  box(parent, 0x384155, x + side * .65, 5, z, 1.45, .15, .2);
  box(parent, lampGlow, x + side * 1.2, 4.9, z, .55, .12, .23);
}

export function buildCity(scene) {
  const random = createRandom(117);
  const walls = facades();
  const solids = [];
  const asphalt = texture(128, 128, ctx => {
    ctx.fillStyle = '#555267';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4400; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff14' : '#00000020';
      ctx.fillRect(random() * 128, random() * 128, 1.4, 1.4);
    }
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(120, 120);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1220, 1220), new THREE.MeshStandardMaterial({ map: asphalt }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const dashes = [];
  for (let road = -LIMIT; road <= LIMIT; road += STEP) {
    for (let offset = -LIMIT; offset < LIMIT; offset += STEP) {
      for (let d = 15; d <= 85; d += 7) {
        dashes.push([road, offset + d, .18, 3.3], [offset + d, road, 3.3, .18]);
      }
      for (const side of [-1, 1]) {
        dashes.push([road + side * 7.9, offset + 50, .12, 80], [offset + 50, road + side * 7.9, 80, .12]);
      }
    }
  }
  const markings = new THREE.InstancedMesh(new THREE.BoxGeometry(), paint(0xffe3a6), dashes.length);
  const transform = new THREE.Object3D();
  dashes.forEach(([x, z, w, d], i) => {
    transform.position.set(x, .025, z);
    transform.scale.set(w, .018, d);
    transform.updateMatrix();
    markings.setMatrixAt(i, transform.matrix);
  });
  markings.receiveShadow = true;
  scene.add(markings);

  for (let x = -LIMIT + 50; x < LIMIT; x += STEP) {
    for (let z = -LIMIT + 50; z < LIMIT; z += STEP) {
      const block = new THREE.Group();
      scene.add(block);
      box(block, 0xc2a79f, x, .1, z, BLOCK, .2, BLOCK);
      box(block, 0xb98e80, x, .17, z, 71, .2, 71);
      for (const dx of [-18, 18]) {
        for (const dz of [-18, 18]) {
          const bx = x + dx;
          const bz = z + dz;
          const w = 23 + random() * 8;
          const d = 23 + random() * 8;
          const h = 12 + random() * (x > 430 ? 15 : 43);
          const style = Math.floor(random() * walls.length);
          box(block, walls[style], bx, h / 2 + .25, bz, w, h, d, true);
          box(block, paint(palettes[style][1]), bx, h + .46, bz, w + .65, .5, d + .65, true);
          box(block, 0x82758a, bx - 2, h + 1.6, bz + 1, w / 3, 2, d / 3, true);
          solids.push({ x: bx, z: bz, w: w / 2, d: d / 2, height: h + 1 });
        }
      }
      if (x > 350 || (x + z) % 200 === 0) {
        palm(block, x + 37, z - 26, 6 + random() * 3);
        palm(block, x + 37, z + 24, 6 + random() * 3);
        lamp(block, x + 38, z, 1);
      }
    }
  }
  // Add Cartagena details along the existing street grid.
  for (const solid of solids) {
    if (solid.x < -430 || solid.x > -120 || solid.z < -170 || solid.z > 170) continue;
    const balconyZ = solid.z + solid.d + .32;
    const y = Math.min(8, solid.height * .58);
    box(scene, 0x664b43, solid.x, y, balconyZ, Math.min(5, solid.w * 1.35), .18, .9);
    for (const side of [-1, 1]) {
      box(scene, 0x493e3c, solid.x + side * 1.8, y + .52, balconyZ + .34, .12, 1.05, .12);
      box(scene, 0x493e3c, solid.x + side * .9, y + .52, balconyZ + .34, .09, 1.05, .09);
    }
    box(scene, 0x493e3c, solid.x, y + .97, balconyZ + .34, Math.min(5, solid.w * 1.35), .1, .12);
  }
  const mural = texture(256, 160, ctx => {
    ctx.fillStyle = '#dd805e'; ctx.fillRect(0, 0, 256, 160);
    ctx.fillStyle = '#f2c463'; ctx.beginPath(); ctx.arc(130, 57, 35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#387f84'; ctx.beginPath(); ctx.moveTo(0, 160); ctx.lineTo(75, 78); ctx.lineTo(145, 160); ctx.fill();
    ctx.fillStyle = '#265c68'; ctx.beginPath(); ctx.moveTo(95, 160); ctx.lineTo(194, 70); ctx.lineTo(256, 160); ctx.fill();
    ctx.fillStyle = '#f7dca6'; ctx.fillRect(22, 121, 212, 7);
    ctx.font = 'bold 19px sans-serif'; ctx.fillStyle = '#492f49'; ctx.fillText('LA PERLA', 76, 148);
  });
  mural.colorSpace = THREE.SRGBColorSpace;
  const muralWall = solids.find(solid => solid.x > 0 && solid.x < 180 && solid.z > 180);
  if (muralWall) {
    const art = new THREE.Mesh(new THREE.PlaneGeometry(11, 6), new THREE.MeshBasicMaterial({ map: mural }));
    art.position.set(muralWall.x, 7, muralWall.z + muralWall.d + .03);
    scene.add(art);
  }
  // An open-air fruit cart and domino table sit beside the coastal market road.
  box(scene, 0xb37a50, 523, 1.05, 99, 3.2, 2, 1.5, true);
  box(scene, 0xead3a5, 523, 2.12, 99, 4.1, .18, 2.2);
  for (let i = 0; i < 8; i++) {
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 6), paint([0xf1b23c, 0xc95444, 0x77a64c][i % 3]));
    fruit.position.set(521.6 + (i % 4) * .85, 2.36, 98.5 + Math.floor(i / 4) * .6);
    scene.add(fruit);
  }
  box(scene, 0x624640, 515, .9, 105, 2.4, .2, 1.7);
  for (const x of [514.2, 515.8]) for (const z of [104.5, 105.5]) box(scene, 0x433a3d, x, .43, z, .12, .85, .12);
  box(scene, 0xf2e8d4, 515, 1.03, 105, .95, .035, .42);
  for (let i = 0; i < 4; i++) box(scene, 0x342e36, 514.65 + i * .22, 1.065, 105, .04, .02, .32);
  for (const [x, z, heading] of [[513.5, 105, Math.PI / 2], [516.5, 105, -Math.PI / 2]]) {
    const dominoPlayer = new THREE.Group();
    box(dominoPlayer, 0x398786, 0, 1.1, 0, .38, .65, .28, true);
    box(dominoPlayer, 0xe2ad7c, 0, 1.62, 0, .28, .28, .28, true);
    dominoPlayer.position.set(x, 0, z); dominoPlayer.rotation.y = heading; scene.add(dominoPlayer);
  }
  // Low colonial perimeter walls around the old town grid leave four road gates open.
  const wallSegment = (x, z, w, d) => {
    box(scene, 0xc6a27e, x, 1.15, z, w, 2.3, d, true);
    box(scene, 0xdfbd94, x, 2.38, z, w + .6, .22, d + .6, true);
    solids.push({ x, z, w: w / 2, d: d / 2, height: 2.5 });
  };
  for (const z of [-302, 302]) {
    for (let x = -588; x < 28; x += 100) {
      wallSegment(x + 25, z, 46, 3);
      wallSegment(x + 75, z, 46, 3);
    }
  }
  for (const x of [-588, 28]) {
    for (let z = -302; z < 302; z += 100) {
      wallSegment(x, z + 25, 3, 46);
      wallSegment(x, z + 75, 3, 46);
    }
  }
  // A compact port fort, with battlements facing the sea and modern glass towers inland.
  box(scene, 0xb58a68, 565, 3.5, 52, 26, 7, 2.2, true);
  box(scene, 0xc49b73, 565, 3.5, 68, 26, 7, 2.2, true);
  box(scene, 0xb58a68, 553, 3.5, 60, 2.2, 7, 16, true);
  box(scene, 0xb58a68, 577, 3.5, 60, 2.2, 7, 16, true);
  for (const x of [553, 577]) box(scene, 0x8a6252, x, 7.2, 60, 4, .55, 4, true);
  for (const [x, z, height] of [[390, 25, 58], [423, 45, 46]]) {
    const tower = new THREE.Group();
    box(tower, 0x3e6578, 0, height / 2, 0, 17, height, 17, true);
    for (let y = 5; y < height - 2; y += 5) box(tower, 0x9bd2d4, 0, y, 8.58, 12, .35, .12);
    box(tower, 0xd6c3a3, 0, height + .4, 0, 19, .8, 19, true);
    tower.position.set(x, 0, z);
    scene.add(tower);
  }
  return solids;
}
