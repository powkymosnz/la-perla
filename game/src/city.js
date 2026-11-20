import * as THREE from '../vendor/three.module.min.js';
import { createRandom } from './random.js';
import { batchStaticParts, beam, box, paint, texture } from './geometry.js';

export const STEP = 100;
export const BLOCK = 80;
export const FIRST_BLOCK = -550;
const lampGlow = new THREE.MeshStandardMaterial({ color: 0xa7a6a0, emissive: 0xffcf8c, emissiveIntensity: 0 });
export const LIMIT = 600;
const districts = {
  oldTown: { wall: '#fff2db', trim: '#947161', glass: '#526b70', name: 'CASA COLONIAL' },
  port: { wall: '#91877b', trim: '#4b5154', glass: '#526978', name: 'PUERTO' },
  market: { wall: '#e4bf82', trim: '#bb664e', glass: '#4b7775', name: 'MERCADO' },
  coast: { wall: '#efd5ae', trim: '#5b9b9a', glass: '#547a87', name: 'MALECON' },
  towers: { wall: '#243a4d', trim: '#24abb4', glass: '#101e34', name: 'LA PERLA' },
  hills: { wall: '#b7a68d', trim: '#776958', glass: '#567879', name: 'LAS LOMAS' },
};
const districtNames = Object.keys(districts);
const signGeometry = new THREE.PlaneGeometry(9, 2.1);
const fruitGeometry = new THREE.SphereGeometry(.23, 7, 5);
const signMaterials = new Map();

function districtAt(x, z) {
  if (x < 50 && Math.abs(z) < 340) return 'oldTown';
  if (x > 485 && z > 75 && z < 190) return 'market';
  if (x > 485 && Math.abs(z) < 145) return 'port';
  if (x > 320 && x < 475 && Math.abs(z) < 150) return 'towers';
  if (x > 485 && Math.abs(z) >= 145) return 'coast';
  if (x < 255 && (Math.abs(z) > 140 || x > 60)) return 'market';
  if (x < -270 && Math.abs(z) < 140) return 'hills';
  return 'coast';
}

export function districtNameAt(x, z) {
  if (x > 635 && Math.abs(z - 48) < 12) return 'Pier';
  if (x > 485 && z < -245) return 'Casino Row';
  if (x > 485 && z > 190 && z < 370) return 'Marina';
  return { oldTown: 'Old Town', port: 'Port Fort', market: 'Market', coast: 'Malecón', towers: 'Glass Towers', hills: 'The Hills' }[districtAt(x, z)];
}

function facades(lighting) {
  return Object.values(districts).map(({ wall, trim, glass }, index) => {
    const random = createRandom(36 + index);
    const map = texture(128, 256, ctx => {
      ctx.fillStyle = wall;
      ctx.fillRect(0, 0, 128, 256);
      for (let y = 4; y < 252; y += index === 0 ? 64 : 32) {
        ctx.fillStyle = 'rgba(38,33,43,.22)';
        ctx.fillRect(0, y + 25, 128, 4);
        for (let x = 7; x < 128; x += 32) {
          ctx.fillStyle = trim;
          ctx.fillRect(x - 3, y - 2, 24, 26);
          ctx.fillStyle = 'rgba(255,235,200,.7)';
          ctx.fillRect(x - 2, y - 1, 22, 2);
          ctx.fillStyle = random() < .13 ? '#ffd992' : glass;
          ctx.fillRect(x, y, 18, 19);
          ctx.fillStyle = 'rgba(255,255,255,.34)';
          ctx.fillRect(x + 1, y + 2, 3, 13);
          ctx.fillStyle = trim;
          ctx.fillRect(x + 8, y, 1.5, 19);
          ctx.fillRect(x, y + 9, 18, 1.5);
          ctx.fillRect(x - 3, y + 20, 24, 2);
          if (index === 0) {
            ctx.fillStyle = '#f9e6c7'; ctx.fillRect(x - 3, y + 5, 24, 42);
            ctx.beginPath(); ctx.arc(x + 9, y + 6, 12, Math.PI, 0); ctx.fill();
            ctx.fillStyle = random() < .15 ? '#ffd48d' : '#3e655e';
            ctx.fillRect(x, y + 6, 18, 37);
            ctx.beginPath(); ctx.arc(x + 9, y + 6, 9, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#c5ac80'; ctx.fillRect(x + 8, y + 8, 2, 35);
            ctx.fillRect(x - 3, y + 44, 24, 3);
          }
        }
      }
    });
    const emissiveMap = texture(128, 256, ctx => {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 128, 256);
      const lights = createRandom(120 + index);
      for (let y = 4; y < 252; y += index === 0 ? 64 : 32) for (let x = 7; x < 128; x += 32) {
        if (lights() < .62) {
          ctx.fillStyle = lights() < .3 ? '#77cbd0' : '#ffd392';
          ctx.fillRect(x, y + (index === 0 ? 6 : 0), 18, index === 0 ? 37 : 19);
          ctx.fillStyle = '#000'; ctx.fillRect(x + 8, y, 2, index === 0 ? 43 : 19);
        }
      }
    });
    const side = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0 });
    lighting.facades.push(side);
    return side;
  });
}

function districtSign(name, color) {
  const key = `${name}/${color}`;
  if (!signMaterials.has(key)) {
    const map = texture(256, 64, ctx => {
      ctx.fillStyle = '#1d2835'; ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(3, 3, 250, 58);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 23px sans-serif'; ctx.fillText(name, 128, 32);
    });
    signMaterials.set(key, new THREE.MeshBasicMaterial({ map }));
  }
  return signMaterials.get(key);
}

function facadeDetails(parent, x, z, w, d, height, district, seed) {
  const style = districts[district];
  const front = z + d / 2 + .035;
  const roofY = height + .24;
  box(parent, paint(style.trim), x, roofY, z, w + 1.1, .42, d + 1.1, true);
  if ((seed % 3) !== 0) {
    box(parent, paint(style.wall), x, height + 1.15, z, w * .72, 1.35, d * .7, true);
    box(parent, paint(style.trim), x, height + 1.86, z, w * .76, .16, d * .74);
  }
  if (district === 'oldTown') {
    // The window atlas supplies glazing and sills while the balconies cast their own shadows.
    for (const bay of [-1, 1]) {
      const wx = x + bay * w * .34;
      box(parent, 0x3e4d4b, wx, 4.45, front + .32, 2.5, .1, .62);
      for (const side of [-1, 1]) box(parent, 0x48524d, wx + side * .646, 4.97, front + .55, .08, .92, .08);
      box(parent, 0x48524d, wx, 5.44, front + .55, 2.5, .09, .08);
    }
    box(parent, 0xe9d2aa, x, .65, z, w + .28, .65, d + .28);
    for (const side of [-1, 1]) {
      const wallX = x + side * (w / 2 + .08);
      box(parent, 0xe9d2aa, wallX, 2.15, z, .22, 3.4, 2.7);
      box(parent, 0x4b6f69, wallX + side * .14, 2.15, z, .06, 2.95, 2.2);
      for (const bay of [-1, 1]) {
        const pz = z + bay * d * .29;
        box(parent, 0x5d5147, wallX + side * .42, 5.1, pz, .9, .14, 4.8);
        box(parent, 0x3d514a, wallX + side * .83, 6.05, pz, .08, .12, 4.8);
        for (let rail = -2; rail <= 2; rail++) box(parent, 0x3d514a, wallX + side * .83, 5.58, pz + rail, .07, .93, .07);
      }
    }
  }
  if (district === 'market' && seed % 2 === 0) {
    const awningY = 3.15;
    box(parent, paint(seed % 4 ? 0xd75d49 : 0x347e80), x, awningY, front + .82, w * .78, .22, 1.55);
    for (let stripe = -2; stripe <= 2; stripe++) {
      box(parent, paint(stripe % 2 ? 0xffd694 : 0xf6e2bd), x + stripe * w * .14, awningY + .13, front + .82, .12, .035, 1.5);
    }
  }
  if (seed % 5 === 0) {
    const sign = new THREE.Mesh(signGeometry, districtSign(style.name, district === 'towers' ? '#45d7dc' : '#ffd796'));
    sign.scale.x = Math.min(1, w * .8 / 9);
    sign.position.set(x, 2.55, front + .17);
    parent.add(sign);
  }
}

const palmLeaf = new THREE.BufferGeometry();
palmLeaf.setAttribute('position', new THREE.Float32BufferAttribute([
  0, 0, 0, 1.7, -.15, -.55, 1.6, .28, 0,
  1.6, .28, 0, 1.7, -.15, -.55, 3.5, -.9, 0,
  0, 0, 0, 1.6, .28, 0, 1.7, -.15, .55,
  1.6, .28, 0, 3.5, -.9, 0, 1.7, -.15, .55,
], 3));
palmLeaf.computeVertexNormals();
const leaves = [0x417b50, 0x638e48].map(color => new THREE.MeshLambertMaterial({
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
  let root = parent; while (root.parent) root = root.parent;
  root.userData.cityLighting?.lamps.push([x + side * 1.2, z]);
  box(parent, 0x384155, x, .18, z, .45, .36, .45);
  box(parent, 0x384155, x, 2.5, z, .16, 5, .16);
  box(parent, 0x384155, x + side * .65, 5, z, 1.45, .15, .2);
  box(parent, lampGlow, x + side * 1.2, 4.9, z, .55, .12, .23);
}

function boulevardFixtures(scene) {
  const shield = new THREE.PlaneGeometry(1.28, 1.28);
  const crossing = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, alphaTest: .5,
    map: texture(96, 96, ctx => {
      ctx.translate(48, 48); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#f9c446'; ctx.fillRect(-31, -31, 62, 62);
      ctx.strokeStyle = '#393744'; ctx.lineWidth = 3; ctx.strokeRect(-28, -28, 56, 56);
      ctx.rotate(-Math.PI / 4); ctx.fillStyle = '#302e39';
      ctx.beginPath(); ctx.arc(2, -15, 4.5, 0, 2 * Math.PI); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(-3, 5); ctx.lineTo(-12, 17);
      ctx.moveTo(-3, 5); ctx.lineTo(6, 10); ctx.lineTo(9, 19);
      ctx.moveTo(-1, -7); ctx.lineTo(-10, 0); ctx.moveTo(-1, -7); ctx.lineTo(9, -1); ctx.stroke();
    }) });
  const random = createRandom(710);
  for (const x of [-400, -300, -200, 300, 400, 500, 600]) for (let block = -300; block < 300; block += STEP) {
    for (const side of [-1, 1]) {
      const curb = x + side * 10.45;
      for (const offset of [24, 75]) lamp(scene, curb, block + offset, -side);
      palm(scene, curb + side * 2.3, block + 36, 7 + random() * 3);
      palm(scene, curb + side * 2.3, block + 63, 6.5 + random() * 3);
      const signZ = block + (side > 0 ? 83 : 17), sx = curb + side * .65;
      box(scene, 0x414d52, sx, 1.51, signZ, .085, 3.02, .085);
      const sign = new THREE.Mesh(shield, crossing); sign.position.set(sx, 2.65, signZ); scene.add(sign);
    }
    const poleX = x - 13.8;
    const wireSegments = [[14, 44, 6.7, 5.8], [44, 77, 5.8, 5.8], [77, 114, 5.8, 6.7]];
    box(scene, 0x69504b, poleX, 3.53, block + 14, .225, 7.05, .225, true);
    box(scene, 0x544a50, poleX, 6.62, block + 14, 1.72, .12, .12);
    for (const dx of [-.63, .63]) {
      box(scene, 0xb5a38a, poleX + dx, 6.74, block + 14, .15, .16, .15);
      // Skip the span after the final pole; the three beam segments read as a sagging cable.
      if (block < 200) for (const [a, b, ya, yb] of wireSegments) {
        beam(scene, 0x53414b, new THREE.Vector3(poleX + dx, ya, block + a), new THREE.Vector3(poleX + dx, yb, block + b), .033);
      }
    }
  }
}

export function buildCity(scene) {
  const firstChild = scene.children.length;
  const random = createRandom(117);
  const lighting = scene.userData.cityLighting = { facades: [], lamps: [], lampGlow };
  const walls = facades(lighting);
  const solids = [];
  const asphalt = texture(128, 128, ctx => {
    ctx.fillStyle = '#484652';
    ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4400; i++) {
      ctx.fillStyle = i % 2 ? '#ffffff0c' : '#00000011';
      ctx.fillRect(random() * 128, random() * 128, 1.4, 1.4);
    }
  });
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.repeat.set(120, 120);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1220, 1220), new THREE.MeshStandardMaterial({ map: asphalt, roughness: .92 }));
  lighting.road = ground.material;
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const dashes = [], crossings = [], bays = [];
  for (let road = -LIMIT; road <= LIMIT; road += STEP) {
    for (let offset = -LIMIT; offset < LIMIT; offset += STEP) {
      for (let d = 15; d <= 85; d += 7) {
        dashes.push([road, offset + d, .18, 3.3], [offset + d, road, 3.3, .18]);
      }
      if ([-400, -300, -200, 300, 400, 500, 600].includes(road) && offset >= -300 && offset < 300) {
        for (const end of [12, 88]) for (let lane = -5.6; lane <= 5.7; lane += 1.6) {
          crossings.push([road + lane, offset + end, .69, 2.6]);
          crossings.push([road + (end === 12 ? 12 : -12), offset + lane, 2.6, .69]);
        }
        for (const side of [-1, 1]) for (const at of [25, 42, 58, 75]) {
          bays.push([road + 7.8 * side, offset + at, .10, 11.8]);
          bays.push([road + 7.1 * side, offset + at + 5.9, 1.5, .10]);
        }
      }
      for (const side of [-1, 1]) {
        dashes.push([road + side * 7.9, offset + 50, .12, 80], [offset + 50, road + side * 7.9, 80, .12]);
      }
    }
  }
  const roadMark = new THREE.PlaneGeometry(1, 1);
  roadMark.rotateX(-Math.PI / 2);
  const transform = new THREE.Object3D();
  for (const [list, color] of [[dashes, 0xe2bd78], [crossings, 0xe6d5c1], [bays, 0xbeb3af]]) {
    const markings = new THREE.InstancedMesh(roadMark, paint(color), list.length);
    list.forEach(([x, z, w, d], i) => {
      transform.position.set(x, .025, z);
      transform.scale.set(w, 1, d);
      transform.updateMatrix();
      markings.setMatrixAt(i, transform.matrix);
    });
    markings.receiveShadow = true; scene.add(markings);
  }

  for (let x = FIRST_BLOCK; x < LIMIT; x += STEP) {
    for (let z = FIRST_BLOCK; z < LIMIT; z += STEP) {
      const block = new THREE.Group();
      scene.add(block);
      box(block, 0xc2a79f, x, .1, z, BLOCK, .2, BLOCK);
      box(block, 0xb98e80, x, .17, z, 71, .2, 71);
      for (const dx of [-18, 18]) {
        for (const dz of [-18, 18]) {
          // Reserve landmark parcels instead of embedding them inside generic buildings.
          if ((x === 550 || x === 350 || x === 450) && z === 50) continue;
          if (x === 550 && z === 150) continue;
          if (x === 550 && z === -350 && dx === -18 && dz === 18) continue;
          const bx = x + dx;
          const bz = z + dz;
          const w = 23 + random() * 8;
          const d = 23 + random() * 8;
          const district = districtAt(bx, bz);
          const h = district === 'towers' ? 32 + random() * 32 :
            district === 'oldTown' ? 11 + random() * 8 :
              district === 'port' ? 8 + random() * 15 : 12 + random() * 28;
          const style = districtNames.indexOf(district);
          const body = box(block, walls[style], bx, h / 2 + .25, bz, w, h, d, true);
          body.userData.tint = new THREE.Color(district === 'oldTown' ? [0xedb59e, 0x9dbcb1, 0xe6cd86, 0xc9add4][Math.floor(random() * 4)] : 0xffffff);
          facadeDetails(block, bx, bz, w, d, h, district, Math.floor(random() * 1000));
          if (district === 'towers') {
            box(block, 0x182c3c, bx - w * .18, h + 2.4, bz, w * .52, 4.5, d * .65, true);
            box(block, 0x21aeb6, bx, h + .7, bz + d / 2 + .08, w * .72, .12, .1);
          }
          solids.push({ x: bx, z: bz, w: w / 2, d: d / 2, height: h + 2.2, district });
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

  // Waterfront port cranes and stacked cargo give the fort approach a working-harbor silhouette.
  for (const [x, y, z, color] of [[525, 1.6, 28, 0xc46b45], [539, 1.6, 28, 0x43818b], [525, 4.8, 28, 0x9a6049], [533, 1.6, 42, 0x508486]]) {
    box(scene, color, x, y, z, 12, 3.1, 4, true);
    for (let rib = -5.5; rib <= 5.5; rib += .7) box(scene, 0x394c51, x + rib, y, z + 2.04, .055, 2.85, .06);
    for (const side of [-1, 1]) box(scene, 0xb3b4a0, x + side * 2.7, y, z + 2.09, .07, 2.6, .06);
    solids.push({ x, z, w: 6, d: 2, height: y + 1.55 });
  }
  for (const [x, z] of [[527, 54], [578, 24]]) {
    box(scene, 0xe0a465, x, 12, z, .65, 24, .65, true);
    box(scene, 0xe0a465, x + 6.5, 23.5, z, 19, .6, .6, true);
    beam(scene, 0x504c4a, new THREE.Vector3(x + 14, 23, z), new THREE.Vector3(x + 14, 7, z), .045);
    beam(scene, 0x504c4a, new THREE.Vector3(x, 17, z), new THREE.Vector3(x + 13, 23.5, z), .08);
  }
  // Market fruit stands and benches create low, readable street-level silhouettes.
  for (const [x, z, canopy] of [[527, 126, 0xd46d50], [541, 126, 0x398982], [555, 126, 0xd7a94c], [571, 145, 0x398982], [527, 159, 0xd46d50]]) {
    box(scene, 0x825640, x, 1.1, z, 5.2, 1.7, 2.6, true);
    box(scene, canopy, x, 3.2, z, 6.4, .22, 3.8, true);
    for (let stripe = -2; stripe <= 2; stripe++) box(scene, 0xf8dcac, x + stripe * 1.15, 3.32, z, .38, .025, 3.8);
    for (const side of [-1, 1]) for (const end of [-1, 1]) box(scene, 0x58473d, x + side * 2.9, 1.6, z + end * 1.65, .14, 3.2, .14);
    for (let fruit = 0; fruit < 5; fruit++) {
      const orb = new THREE.Mesh(fruitGeometry, paint([0xf2b33f, 0xd75d49, 0x6d9b4c][fruit % 3]));
      orb.position.set(x - 1.7 + fruit * .84, 2.2, z);
      scene.add(orb);
    }
  }
  for (const [x, z] of [[-420, -88], [-312, 112], [76, -88]]) {
    box(scene, 0x74513e, x, .82, z, 3.8, .18, .72);
    for (const side of [-1, 1]) box(scene, 0x443c38, x + side * 1.4, .4, z, .14, .8, .55);
    box(scene, 0x443c38, x, 1.15, z - .28, 3.4, .12, .12);
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
  for (const side of [-1, 1]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, .17, 10), paint(0x37353b));
    wheel.rotation.x = Math.PI / 2; wheel.position.set(523, .4, 99 + side * .83); scene.add(wheel);
  }
  box(scene, 0xead3a5, 523, 2.12, 99, 4.1, .18, 2.2);
  for (let i = 0; i < 8; i++) {
    const fruit = new THREE.Mesh(fruitGeometry, paint([0xf1b23c, 0xc95444, 0x77a64c][i % 3]));
    fruit.position.set(521.6 + (i % 4) * .85, 2.36, 98.5 + Math.floor(i / 4) * .6);
    scene.add(fruit);
  }
  box(scene, 0x624640, 515, .9, 105, 2.4, .2, 1.7);
  for (const x of [514.2, 515.8]) for (const z of [104.5, 105.5]) box(scene, 0x433a3d, x, .43, z, .12, .85, .12);
  box(scene, 0xf2e8d4, 515, 1.03, 105, .95, .035, .42);
  for (let i = 0; i < 4; i++) box(scene, 0x342e36, 514.65 + i * .22, 1.065, 105, .04, .02, .32);
  // The crowd pool seats four animated domino players around this table.
  // Low colonial perimeter walls around the old town grid leave four road gates open.
  const wallSegment = (x, z, w, d) => {
    box(scene, 0xc6a27e, x, 1.15, z, w, 2.3, d, true);
    box(scene, 0xdfbd94, x, 2.38, z, w + .6, .22, d + .6, true);
    solids.push({ x, z, w: w / 2, d: d / 2, height: 2.5 });
  };
  for (const z of [-310, 310]) for (let x = -550; x < 50; x += STEP) wallSegment(x, z, 80, 3);
  for (const x of [-590, 10]) for (let z = -250; z < 300; z += STEP) wallSegment(x, z, 3, 80);
  // A compact port fort, with battlements facing the sea and modern glass towers inland.
  const stone = texture(256, 128, ctx => {
    ctx.fillStyle = '#806f5a'; ctx.fillRect(0, 0, 256, 128);
    for (let row = 0; row < 8; row++) for (let col = -1; col < 8; col++) {
      ctx.fillStyle = ['#baa282', '#c2ab8a', '#ae9679', '#c8ad8b'][(row * 7 + col + 8) % 4];
      ctx.fillRect(col * 38 + row % 2 * 19, row * 16 + 1, 36, 14);
    }
  });
  const fortStone = new THREE.MeshLambertMaterial({ map: stone });
  box(scene, fortStone, 565, 3.5, 52, 26, 7, 2.2, true);
  box(scene, fortStone, 565, 3.5, 68, 26, 7, 2.2, true);
  box(scene, fortStone, 553, 3.5, 60, 2.2, 7, 16, true);
  box(scene, fortStone, 577, 3.5, 60, 2.2, 7, 16, true);
  const bastionShape = new THREE.CylinderGeometry(1.65, 2, 8, 8);
  for (const x of [553, 577]) for (const z of [52, 68]) {
    const bastion = new THREE.Mesh(bastionShape, fortStone);
    bastion.position.set(x, 4, z); bastion.castShadow = true; scene.add(bastion);
    for (const side of [-1, 1]) box(scene, 0xe0c39b, x + side, 8.25, z, .6, .6, 1);
  }
  for (const [x, z, w, d] of [[565, 52, 26, 2.2], [565, 68, 26, 2.2], [553, 60, 2.2, 16], [577, 60, 2.2, 16]])
    solids.push({ x, z, w: w / 2, d: d / 2, height: 7 });
  for (const z of [52, 68]) {
    for (let x = 553; x <= 577; x += 4)
      box(scene, 0xd7b48b, x, 7.6, z, 1.8, 1.25, 2.5, true);
  }
  for (const x of [553, 577]) box(scene, 0x8a6252, x, 7.2, 60, 4, .55, 4, true);
  // Set the west tower back ten units so its podium leaves the curb lane unobstructed.
  for (const [x, z, height] of [[380, 25, 58], [423, 45, 46]]) {
    const tower = new THREE.Group();
    const glass = new THREE.MeshLambertMaterial({ color: 0x397783, map: walls[4].map,
      emissiveMap: walls[4].emissiveMap, emissive: 0xffffff, emissiveIntensity: 0 });
    lighting.facades.push(glass);
    box(tower, glass, 0, height / 2, 0, 17, height, 17, true);
    box(tower, 0x31525d, 0, 2, 0, 23, 4, 23, true);
    for (let y = 5; y < height - 2; y += 5) {
      for (const side of [-1, 1]) {
        box(tower, 0x9bd2d4, 0, y, side * 8.58, 12, .35, .12);
        box(tower, 0x9bd2d4, side * 8.58, y, 0, .12, .35, 12);
      }
    }
    box(tower, 0xd6c3a3, 0, height + .4, 0, 19, .8, 19, true);
    const neon = new THREE.MeshBasicMaterial({ color: x === 380 ? 0x4dd8d4 : 0xeb718f });
    for (const side of [-1, 1]) {
      box(tower, neon, side * 8.62, height * .52, 8.62, .14, height - 8, .14);
      box(tower, neon, 0, height + .9, side * 9.35, 18.7, .14, .14);
    }
    const ad = texture(512, 192, ctx => {
      ctx.fillStyle = x === 380 ? '#087d82' : '#c85e56'; ctx.fillRect(0, 0, 512, 192);
      ctx.fillStyle = '#f5d69d'; ctx.fillRect(16, 16, 480, 160);
      ctx.fillStyle = x === 380 ? '#087d82' : '#883d50'; ctx.fillRect(22, 22, 468, 148);
      ctx.fillStyle = '#ffe3a8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 64px sans-serif'; ctx.fillText(x === 380 ? 'LA PERLA' : 'SOL DE ORO', 256, 78);
      ctx.font = 'bold 24px sans-serif'; ctx.fillText(x === 380 ? 'RADIO 101.9 · VIVE LA COSTA' : 'JUGO NATURAL · SABOR DEL CARIBE', 256, 130);
      ctx.fillStyle = '#f5c75e';
      for (let i = 0; i < 9; i++) ctx.fillRect(46 + i * 52, 150, 26, 4);
    });
    ad.colorSpace = THREE.SRGBColorSpace;
    const adPanel = new THREE.Mesh(new THREE.PlaneGeometry(18.5, 6.4), new THREE.MeshBasicMaterial({ map: ad, side: THREE.DoubleSide }));
    adPanel.position.set(0, 5.2, -11.72);
    adPanel.rotation.y = Math.PI;
    tower.add(adPanel);
    box(tower, 0xe8ca97, 0, 1.25, -11.65, 20, .4, .18);
    solids.push({ x, z, w: 8.5, d: 8.5, height });
    tower.position.set(x, 0, z);
    scene.add(tower);
  }
  boulevardFixtures(scene);
  // Batch immutable city meshes by geometry/material and neighborhood.
  batchStaticParts(scene, scene.children.slice(firstChild), 150);
  return solids;
}
