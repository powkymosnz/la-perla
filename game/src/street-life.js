import * as THREE from '../vendor/three.module.min.js';
import { batchStaticParts, box, paint, texture } from './geometry.js';

// Shared bay coordinates keep every sunbather on an actual towel under an umbrella.
export const BEACH_BAYS = [];
for (let z = -570; z <= 570; z += 20) for (const [x, offset] of [[628, 0], [642, 8]]) {
  if (Math.abs(z + offset - 48) >= 15) BEACH_BAYS.push([x, z + offset]);
}
const colors = [0xe56f66, 0x24a9a6, 0xf0bf4c, 0x7867a1, 0xe38bac];
const canopyShape = new THREE.ConeGeometry(2.9, 1.05, 12, 1, true);
const canopyWhite = new THREE.MeshLambertMaterial({ color: 0xffebc6, side: THREE.DoubleSide });
function parasol(parent, x, z, index, radius = 1) {
  const umbrella = new THREE.Group(); umbrella.position.set(x, 0, z); umbrella.scale.setScalar(radius); parent.add(umbrella);
  box(umbrella, 0xf3d5ab, 0, 1.5, 0, .085, 3, .085);
  const roof = new THREE.Mesh(canopyShape, new THREE.MeshLambertMaterial({ color: colors[index % colors.length], side: THREE.DoubleSide }));
  roof.position.y = 3; roof.castShadow = true; umbrella.add(roof);
  // Pale radial panels give every umbrella a bright striped silhouette from the road.
  for (let n = 0; n < 6; n++) {
    const wedge = new THREE.Mesh(new THREE.ConeGeometry(2.92, 1.06, 1, 1, true, n * Math.PI / 3, Math.PI / 6), canopyWhite);
    wedge.position.y = 3.005; umbrella.add(wedge);
  }
  box(umbrella, 0xf6dfb3, 0, 3.6, 0, .11, .16, .11);
}
function sign(parent, x, z, heading, title, subtitle, tint, big = false) {
  const root = new THREE.Group(); root.position.set(x, 0, z); root.rotation.y = heading; parent.add(root);
  const width = big ? 13 : 6.5, height = big ? 4.5 : 2;
  const bottom = big ? 7 : 3.2;
  for (const side of [-1, 1]) box(root, 0x3f4653, side * width * .36, bottom * .5, -.1, .19, bottom, .2);
  box(root, 0x263440, 0, bottom + height / 2, 0, width + .25, height + .25, .3);
  const map = texture(512, 192, ctx => {
    ctx.fillStyle = '#172d3d'; ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = tint; ctx.lineWidth = 5; ctx.strokeRect(7, 7, 498, 178);
    ctx.fillStyle = tint; ctx.textAlign = 'center'; ctx.font = 'bold 49px sans-serif'; ctx.fillText(title, 256, 88);
    ctx.fillStyle = '#ffdfac'; ctx.font = '22px sans-serif'; ctx.fillText(subtitle, 256, 137);
    ctx.fillStyle = tint; for (let i = 25; i < 500; i += 24) ctx.fillRect(i, 163, 11, 3);
  });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map, side: THREE.DoubleSide }));
  panel.position.set(0, bottom + height / 2, .17); root.add(panel);
  const glow = new THREE.MeshBasicMaterial({ color: tint });
  for (const side of [-1, 1]) box(root, glow, side * (width / 2 + .06), bottom + height / 2, .18, .09, height, .08);
}
function cart(parent, x, z, index) {
  box(parent, 0x8b5b42, x, .95, z, 2.8, 1.3, 1.6, true);
  box(parent, 0xf0d69f, x, 1.65, z, 3.05, .18, 1.85);
  for (const side of [-1, 1]) {
    box(parent, 0x343840, x + side * 1.1, .35, z + .8, .47, .57, .2);
    box(parent, 0x9a714f, x + side * 1.35, 2.25, z, .09, 1.3, .09);
  }
  parasol(parent, x, z, index, .78);
  for (let fruit = 0; fruit < 12; fruit++) box(parent, [0xf8bc45, 0x85a548, 0xdd6551][fruit % 3], x - 1.1 + fruit % 6 * .42, 1.86, z - .4 + Math.floor(fruit / 6) * .5, .32, .28, .33);
}
export function buildStreetLife(scene, benches) {
  const start = scene.children.length;
  // Towels sit below the beach actors, and a clear gap preserves the pier approach.
  let umbrellaCount = 0;
  for (const [x, z] of BEACH_BAYS) {
    parasol(scene, x, z, umbrellaCount++);
    box(scene, colors[umbrellaCount % colors.length], x + 1.7, .025, z + 2.5, 1.5, .035, 2.3);
    box(scene, 0xffe5b2, x + 1.7, .05, z + 3.4, 1.4, .05, .2);
    box(scene, colors[(umbrellaCount + 2) % colors.length], x - 2.5, .3, z - 2.5, .55, .6, .55);
  }
  for (const [x, z] of benches.slice(3)) {
    for (let slat = -1; slat <= 1; slat++) box(scene, 0x9e6a47, x, .68, z + slat * .21, 3.5, .15, .17);
    for (const side of [-1, 1]) { box(scene, 0x42474a, x + side * 1.4, .34, z, .14, .68, .65); box(scene, 0x42474a, x + side * 1.4, 1, z - .34, .13, .8, .13); }
    box(scene, 0x9e6a47, x, 1.1, z - .34, 3.5, .44, .1);
  }
  const carts = [[-313, -5], [-213, 65], [-413, 135], [487, 140], [612, -80], [612, 125], [588, 212], [113, -15], [413, -125]];
  carts.forEach(([x, z], i) => cart(scene, x, z, i));
  // Awnings, hanging pennants and produce crates make the market legible at a distance.
  for (const [x, z] of [[527, 126], [541, 126], [555, 126], [571, 145], [527, 159]]) {
    box(scene, 0xe7ba67, x - 2, .4, z + 2, 1, .8, .85);
    box(scene, 0x7ca35a, x - 2, .94, z + 2, .8, .25, .65);
    for (let n = 0; n < 7; n++) box(scene, colors[n % colors.length], x - 3 + n, 3, z + 1.94, .44, .4, .035);
  }
  sign(scene, 539, 113, Math.PI, 'MERCADO SOL', 'FRUTA FRESCA · DOMINO · CAFE', '#ffc771', true);
  sign(scene, 580, 177, Math.PI, 'LA PLAZA', 'CADA TARDE · MUSICA EN VIVO', '#5be2cd', true);
  sign(scene, -317, -10, Math.PI, 'PERLA VIVA', 'SABORES DEL BARRIO', '#ffac88', true);
  sign(scene, -217, 125, Math.PI, 'CASA BRISA', 'CAFE · PAN · CONVERSACION', '#69dcd0');
  sign(scene, 585, 9, Math.PI, 'BAHIA CLARA', 'SOL · ARENA · LA PERLA', '#63e7dc', true);
  sign(scene, 585, -90, 0, 'COSTA DORADA', 'TU TARDE JUNTO AL MAR', '#ffd575', true);
  sign(scene, 417, -14, Math.PI, 'CLUB MAREA', 'LA NOCHE EMPIEZA AQUI', '#fa84b5', true);
  sign(scene, 387, 84, Math.PI, 'LUZ 101', 'LA VOZ DE LA PERLA', '#53dfed', true);
  sign(scene, 113, -125, 0, 'RITMO LOCAL', 'RADIO · DISCOS · SONIDO', '#e38bda');
  // All immutable street dressing becomes neighborhood-sized batches for culling.
  batchStaticParts(scene, scene.children.slice(start), 100);
  return { umbrellas: umbrellaCount, carts: carts.length, billboards: 9 };
}
