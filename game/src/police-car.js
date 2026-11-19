import * as THREE from '../vendor/three.module.min.js';
import { batchStaticParts, box, paint, taperedBox, texture } from './geometry.js';

let lettering;
export function createPoliceCar(parent) {
  if (!lettering) {
    const map = texture(256, 64, ctx => {
      ctx.font = '900 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#101724';
      ctx.fillText('POLICE', 128, 34);
    });
    lettering = new THREE.MeshBasicMaterial({ map, transparent: true, polygonOffset: true, polygonOffsetFactor: -2 });
  }
  const root = new THREE.Group();
  root.name = 'police-interceptor';
  taperedBox(root, 0x161d28, 0, .74, 0, 2.18, .62, 4.48, .94, .95);
  box(root, 0x222934, 0, 1.02, 1.26, 2.06, .18, 1.62, true);
  box(root, 0x242b35, 0, 1.02, -1.45, 2.02, .18, 1.25, true);
  taperedBox(root, 0x314952, 0, 1.27, -.18, 1.87, .62, 2.13);
  box(root, 0xfff7df, 0, 1.62, -.19, 1.93, .14, 1.75, true);
  box(root, 0x202b31, 0, 1.74, -.18, 1.68, .14, .49);
  const lamps = [0xff203a, 0x2198ff].map((color, index) => {
    const material = new THREE.MeshStandardMaterial({ color, emissive: color, toneMapped: false });
    box(root, material, index ? .43 : -.43, 1.95, -.18, .79, .31, .5);
    return material;
  });
  const badge = (x, y, z, heading, width) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, .31), lettering);
    mesh.position.set(x, y, z);
    mesh.rotation.y = heading;
    root.add(mesh);
  };
  for (const side of [-1, 1]) {
    box(root, 0xfff7df, side * 1.08, .84, -.16, .10, .57, 2.17);
    box(root, 0xeff1e5, side * 1.145, .57, -.16, .035, .08, .82);
    box(root, 0x31404a, side * 1.15, .83, .93, .04, .38, .82);
    badge(side * 1.138, .87, -.16, side * Math.PI / 2, 1.65);
    box(root, 0xffe4b0, side * .72, .86, 2.25, .56, .18, .07);
    box(root, 0xf94b45, side * .77, .86, -2.25, .49, .18, .07);
    for (const axle of [-1, 1]) {
      for (const [radius, width, color] of [[.42, .34, 0x171a22], [.24, .36, 0xb9b6b2]]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 12), paint(color));
        wheel.position.set(side * 1.02, .42, axle * 1.45);
        wheel.rotation.z = Math.PI / 2;
        root.add(wheel);
      }
    }
  }
  box(root, 0xfff7df, 0, .84, -2.25, 1.03, .34, .07);
  box(root, 0x242a34, 0, .73, 2.29, .8, .2, .12);
  for (let i = -2; i <= 2; i++) box(root, 0x7c8790, i * .13, .73, 2.36, .045, .14, .025);
  badge(0, .84, -2.29, Math.PI, .99);
  parent.add(root);
  // The light bar's emissive materials stay separate so the flash can alternate.
  batchStaticParts(root, root.children.slice());
  return { root, flash(t) {
    const alternating = Math.floor(t * 4) % 2;
    lamps.forEach((lamp, i) => { lamp.emissiveIntensity = i === alternating ? 7 : .18; });
  } };
}

// Day 5: patrol identity and flashing emergency lights remain separate from civilian instances.
