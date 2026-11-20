import * as THREE from '../vendor/three.module.min.js';
import { box, texture } from './geometry.js';
import { buildCarModel } from './car-model.js';

let lettering;
export function createPoliceCar(parent) {
  if (!lettering) {
    const map = texture(256, 64, ctx => {
      ctx.font = '900 52px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#121b2b';
      ctx.fillText('POLICE', 128, 34);
    });
    lettering = new THREE.MeshBasicMaterial({ map, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
  }
  const root = new THREE.Group();
  root.name = 'police-interceptor';
  const { model, roll } = buildCarModel('police', root, 0x171e29);
  box(root, 0x151c29, 0, model.roof + .065, -.24, 1.65, .12, .40);
  const lamps = [0xff233b, 0x297eff].map((color, index) => {
    const material = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    box(root, material, index ? .43 : -.43, model.roof + .185, -.24, .74, .17, .33);
    return { material, color: new THREE.Color(color) };
  });
  const badge = (x, y, z, heading, width) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, .29), lettering);
    mesh.position.set(x, y, z);
    mesh.rotation.y = heading;
    root.add(mesh);
  };
  for (const side of [-1, 1]) badge(side * (model.width + .014), .72, -.06, side * Math.PI / 2, 1.64);
  box(root, 0xfff1db, 0, .74, -model.length - .032, 1.07, .24, .028);
  badge(0, .74, -model.length - .05, Math.PI, .99);
  parent.add(root);
  return { root, roll, flash(t) {
    const alternating = Math.floor(t * 6) % 2;
    lamps.forEach(({ material, color }, i) => { material.color.copy(color).multiplyScalar(i === alternating ? 2.3 : .37); });
  } };
}
