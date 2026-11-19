import * as THREE from '../vendor/three.module.min.js';

const cube = new THREE.BoxGeometry();
const taperedShapes = new Map();
export function taperedBox(parent, material, x, y, z, w, h, d, topWidth = .84, topDepth = .8) {
  const key = `${topWidth}/${topDepth}`;
  if (!taperedShapes.has(key)) {
    const shape = cube.clone();
    const vertices = shape.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      if (vertices.getY(i) > 0) {
        vertices.setX(i, vertices.getX(i) * topWidth);
        vertices.setZ(i, vertices.getZ(i) * topDepth);
      }
    }
    shape.computeVertexNormals();
    taperedShapes.set(key, shape);
  }
  const mesh = new THREE.Mesh(taperedShapes.get(key), typeof material === 'number' ? paint(material) : material);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, d);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
  return mesh;
}
const paints = new Map();
const bakedMaterials = new Map();
// Pool static parts into spatial batches while leaving animated roots independent.
export function batchStaticParts(scene, children, cellSize = 400) {
  scene.updateMatrixWorld(true);
  // Store transforms in the root's space so moving a baked vehicle only applies its position once.
  const parentInverse = scene.matrixWorld.clone().invert();
  const batches = new Map();
  const position = new THREE.Vector3();
  for (const child of children) child.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh) return;
    position.setFromMatrixPosition(mesh.matrixWorld);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const bakeColor = materials.length === 1 && !materials[0].map && !materials[0].transparent &&
      (materials[0].isMeshLambertMaterial || materials[0].isMeshBasicMaterial);
    const key = [bakeColor ? `baked-${materials[0].type}-${materials[0].side}` : mesh.geometry.uuid,
      ...(bakeColor ? [] : materials.map(m => m.uuid)), Math.floor(position.x / cellSize), Math.floor(position.z / cellSize)].join('/');
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  });
  for (const [key, parts] of batches) {
    const first = parts[0];
    if (key.startsWith('baked-')) {
      const positions = [], normals = [], colors = [];
      const vertex = new THREE.Vector3(), normal = new THREE.Vector3(), normalMatrix = new THREE.Matrix3();
      for (const mesh of parts) {
        const geometry = mesh.geometry, p = geometry.attributes.position, n = geometry.attributes.normal;
        const count = geometry.index?.count ?? p.count;
        const tint = mesh.material.color.clone();
        if (mesh.userData.tint) tint.multiply(mesh.userData.tint);
        const localMatrix = new THREE.Matrix4().multiplyMatrices(parentInverse, mesh.matrixWorld);
        normalMatrix.getNormalMatrix(localMatrix);
        for (let i = 0; i < count; i++) {
          const index = geometry.index ? geometry.index.getX(i) : i;
          vertex.fromBufferAttribute(p, index).applyMatrix4(localMatrix);
          normal.fromBufferAttribute(n, index).applyMatrix3(normalMatrix).normalize();
          positions.push(vertex.x, vertex.y, vertex.z); normals.push(normal.x, normal.y, normal.z);
          colors.push(tint.r, tint.g, tint.b);
        }
        mesh.removeFromParent();
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      const type = `${first.material.type}/${first.material.side}`;
      if (!bakedMaterials.has(type)) bakedMaterials.set(type, first.material.isMeshBasicMaterial ?
        new THREE.MeshBasicMaterial({ vertexColors: true, side: first.material.side }) : new THREE.MeshLambertMaterial({ vertexColors: true, side: first.material.side }));
      const batch = new THREE.Mesh(geometry, bakedMaterials.get(type));
      batch.castShadow = parts.some(mesh => mesh.castShadow); batch.receiveShadow = true;
      geometry.computeBoundingSphere(); scene.add(batch);
      continue;
    }
    const batch = new THREE.InstancedMesh(first.geometry, first.material, parts.length);
    batch.castShadow = parts.some(mesh => mesh.castShadow);
    batch.receiveShadow = true;
    parts.forEach((mesh, index) => {
      batch.setMatrixAt(index, new THREE.Matrix4().multiplyMatrices(parentInverse, mesh.matrixWorld));
      if (mesh.userData.tint) batch.setColorAt(index, mesh.userData.tint);
      mesh.removeFromParent();
    });
    batch.computeBoundingSphere();
    scene.add(batch);
  }
}

export function paint(color) {
  if (!paints.has(color)) paints.set(color, new THREE.MeshLambertMaterial({ color }));
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

// Day 5: street-life props reuse these local-space, vertex-color spatial batches.
