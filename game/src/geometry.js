import * as THREE from '../vendor/three.module.min.js';

const cube = new THREE.BoxGeometry();
const paints = new Map();
export function paint(color) {
  if (!paints.has(color)) paints.set(color, new THREE.MeshStandardMaterial({ color }));
  return paints.get(color);
}

export function box(parent, material, x, y, z, w, h, d, shadow = false) {
  const mesh = new THREE.Mesh(cube, typeof material === 'number' ? paint(material) : material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const rod = new THREE.CylinderGeometry(1, 1, 1, 7);
const up = new THREE.Vector3(0, 1, 0);

export function beam(parent, color, start, end, radius, shadow = false) {
  const delta = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(rod, paint(color));
  mesh.position.copy(start).addScaledVector(delta, .5);
  mesh.scale.set(radius, delta.length(), radius);
  mesh.quaternion.setFromUnitVectors(up, delta.normalize());
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

export function texture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'));
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}
