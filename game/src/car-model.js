import * as THREE from '../vendor/three.module.min.js';
import { box } from './geometry.js';

const profiles = {
  sedan:   { w: 1.04, l: 2.20, axle: 1.37, r: .42, belt: .98, roof: 1.62, cab: [-1.29, -.96, .34, .93] },
  compact: { w: .93, l: 1.89, axle: 1.14, r: .36, belt: .93, roof: 1.59, cab: [-1.31, -1.18, .33, .82] },
  van:     { w: 1.08, l: 2.32, axle: 1.47, r: .43, belt: 1.06, roof: 1.94, cab: [-1.88, -1.74, .67, 1.34] },
  taxi:    { w: 1.04, l: 2.24, axle: 1.41, r: .41, belt: 1.0, roof: 1.67, cab: [-1.31, -.96, .37, .91] },
  sport:   { w: 1.07, l: 2.27, axle: 1.41, r: .41, belt: .88, roof: 1.43, cab: [-1.58, -.70, .17, .88] },
  police:  { w: 1.06, l: 2.24, axle: 1.42, r: .42, belt: 1.0, roof: 1.65, cab: [-1.32, -.95, .36, .94] },
};
const templates = new Map();
const matte = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .67 });
const glass = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .23, metalness: .08 });
const shine = new THREE.MeshBasicMaterial({ vertexColors: true });
export const carPaint = () => new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .34, metalness: .12 });

// Each role bakes into complete, reusable paint/trim/glass/lamp meshes, in chassis space.
function merge(parts) {
  const p = [], n = [], c = [];
  const v = new THREE.Vector3(), normal = new THREE.Vector3(), matrix = new THREE.Matrix3();
  for (const part of parts) {
    part.updateMatrix(); matrix.getNormalMatrix(part.matrix);
    const g = part.geometry, pos = g.attributes.position, normals = g.attributes.normal;
    const tint = part.material.color;
    for (let i = 0; i < (g.index?.count ?? pos.count); i++) {
      const j = g.index ? g.index.getX(i) : i;
      v.fromBufferAttribute(pos, j).applyMatrix4(part.matrix);
      normal.fromBufferAttribute(normals, j).applyMatrix3(matrix).normalize();
      p.push(v.x, v.y, v.z); n.push(normal.x, normal.y, normal.z); c.push(tint.r, tint.g, tint.b);
    }
  }
  const g = new THREE.BufferGeometry();
  for (const [key, array] of [['position', p], ['normal', n], ['color', c]]) g.setAttribute(key, new THREE.Float32BufferAttribute(array, 3));
  g.computeBoundingSphere();
  return g;
}

function panel(group, color, a, b, c, d, outward) {
  // Keep the winding outward independently of which side of the car is built.
  const normal = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
    .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...c), new THREE.Vector3(...a)));
  const vertices = normal.dot(new THREE.Vector3(...outward)) >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  g.computeVertexNormals();
  group.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color })));
}

export function carTemplate(kind) {
  if (templates.has(kind)) return templates.get(kind);
  const { w, l, axle, r, belt, roof, cab: [rear, roofRear, roofFront, front] } = profiles[kind];
  const sport = kind === 'sport', police = kind === 'police', van = kind === 'van';
  const coat = new THREE.Group(), trim = new THREE.Group(), windows = new THREE.Group(), lights = new THREE.Group(), tails = new THREE.Group();
  const body = 0xffffff, dark = 0x242632, rubber = 0x303943, chrome = sport ? 0x545361 : 0x9da8ae;
  const arch = r + .062;
  // Cross sections from trunk to nose. Bevels in every section catch grazing sunlight.
  const sections = [[-l, .84, -.15], [-l + .17, .99, sport ? .009 : -.053], [rear, .995, sport ? .075 : .035], [front, .98, sport ? .075 : .035], [l - .22, .98, sport ? .009 : -.065], [l, .83, -.19]];
  const ring = ([z, width, rise]) => {
    const x = w * width, y = belt + rise;
    const ridge = Math.abs(z) >= l - .23 && Math.abs(z) - axle > arch ? y - .07 : Math.max(y - .065, r * 2 + .075);
    return [[-x, .29, z], [-x, ridge, z], [-x * .84, y, z], [x * .84, y, z], [x, ridge, z], [x, .29, z]];
  };
  for (let i = 1; i < sections.length; i++) {
    const a = ring(sections[i - 1]), b = ring(sections[i]);
    for (let j = 1; j < 4; j++) panel(coat, body, a[j], b[j], b[j + 1], a[j + 1], [j - 2, j === 2 ? 1 : .1, 0]);
  }
  for (const sign of [-1, 1]) {
    const a = ring(sections[sign < 0 ? 0 : sections.length - 1]);
    panel(coat, body, a[0], a[2], a[3], a[5], [0, 0, sign]);
    panel(coat, body, a[0], a[1], a[2], a[2], [0, 0, sign]);
    panel(coat, body, a[5], a[3], a[4], a[4], [0, 0, sign]);
  }
  const stops = [...sections.map(s => s[0]), ...[-axle, axle].flatMap(z => Array.from({ length: 13 }, (_, i) => z - arch * Math.cos(i * Math.PI / 12)))].sort((a, b) => a - b);
  const edgeAt = z => {
    const i = sections.findIndex(s => s[0] >= z);
    if (i < 1) return ring(sections[i === 0 ? 0 : sections.length - 1])[4];
    const a = ring(sections[i - 1])[4], b = ring(sections[i])[4], t = (z - a[2]) / (b[2] - a[2]);
    return [THREE.MathUtils.lerp(a[0], b[0], t), THREE.MathUtils.lerp(a[1], b[1], t)];
  };
  const archAt = z => {
    const gap = Math.abs(Math.abs(z) - axle);
    return gap < arch + .0001 ? r + Math.sqrt(Math.max(0, arch * arch - gap * gap)) : .29;
  };
  // Split the fender at its upper ridge and lower arch. The tire never disappears into a solid skirt.
  for (const side of [-1, 1]) for (let i = 1; i < stops.length; i++) {
    const za = stops[i - 1], zb = stops[i], [ax, ay] = edgeAt(za), [bx, by] = edgeAt(zb);
    const a = ax * side, b = bx * side;
    const isArch = Math.abs(Math.abs((za + zb) / 2) - axle) < arch;
    const ya = isArch ? archAt(za) : .29, yb = isArch ? archAt(zb) : .29;
    panel(coat, body, [a, ya, za], [b, yb, zb], [b, by, zb], [a, ay, za], [side, 0, 0]);
    if (isArch) panel(trim, rubber, [a, ya, za], [b, yb, zb], [b + side * .008, yb + .029, zb], [a + side * .008, ya + .029, za], [side, 0, 0]);
  }
  box(trim, dark, 0, .36, 0, w * 1.36, .23, l * 1.76);
  // Windshield, rear glass and side glazing follow the actual roof rake.
  const low = w * .855, high = w * (van ? .79 : .69), base = belt + .018, top = roof - .078;
  for (const [z, rz, facing] of [[front, roofFront, 1], [rear, roofRear, -1]]) {
    panel(windows, facing > 0 ? 0x426678 : 0x314957, [-low, base, z], [low, base, z], [high, top, rz], [-high, top, rz], [0, 1, facing]);
    const border = .047;
    panel(trim, 0x91b0b5, [-high, top, rz + facing * .003], [high, top, rz + facing * .003], [high + .022, top - border, rz + (z - rz) * border / (top - base)], [-high - .022, top - border, rz + (z - rz) * border / (top - base)], [0, 1, facing]);
  }
  box(police ? trim : coat, police ? 0xf6edda : body, 0, roof - .025, (roofRear + roofFront) / 2, high * 2 + .055, .105, roofFront - roofRear + .085);
  const doorZ = (front + rear) / 2;
  for (const side of [-1, 1]) {
    const lower = (t, y = base, offset = 0) => [side * (low + offset), y, THREE.MathUtils.lerp(rear, front, t)];
    const upper = (t, y = top, offset = 0) => [side * (high + offset), y, THREE.MathUtils.lerp(roofRear, roofFront, t)];
    panel(windows, 0x406071, lower(0), lower(1), upper(1), upper(0), [side, 0, 0]);
    for (const [a, b] of [[0, .063], [.47, .525], [.934, 1]]) panel(trim, dark, lower(a, base, .012), lower(b, base, .012), upper(b, top, .012), upper(a, top, .012), [side, 0, 0]);
    box(trim, chrome, side * low, base + .017, doorZ, .034, .037, front - rear);
    if (police) box(trim, 0xfff1db, side * w * .975, .698, -.06, .075, .45, 1.78);
    box(trim, chrome, side * w * .999, belt - .124, doorZ - .1, .042, .045, .24);
    box(coat, body, side * (low + .10), base + .10, front - .20, .32, .14, .23);
    box(trim, 0x9cb4ba, side * (low + .12), base + .10, front - .324, .21, .086, .025);
    for (const sign of [-1, 1]) {
      const z = sign * (l + .013);
      box(trim, dark, side * w * .59, belt - .18, z, w * .57, .22, .055);
      box(sign > 0 ? lights : tails, sign > 0 ? 0xffedb8 : 0xf82037, side * w * .59, belt - .15, z + sign * .037, w * .50, .106, .038);
      box(sign > 0 ? lights : tails, sign > 0 ? 0xffb842 : 0xff7580, side * w * .76, belt - .22, z + sign * .021, w * .18, .047, .035);
    }
    if (sport) {
      box(trim, dark, side * .58, belt + .085, -l + .23, .10, .32, .26);
      box(trim, chrome, side * .66, .33, -l - .08, .21, .115, .13);
    }
  }
  for (const sign of [-1, 1]) {
    box(trim, dark, 0, .415, sign * (l + .015), w * 1.71, .24, .13);
    box(trim, chrome, 0, .485, sign * (l + .08), w * 1.71, .05, .045);
  }
  box(trim, dark, 0, belt - .188, l + .018, w * .62, .19, .052);
  for (let i = -3; i <= 3; i++) box(trim, chrome, i * w * .069, belt - .188, l + .05, .028, .115, .019);
  box(trim, 0xf6deb1, 0, belt - .18, -l - .048, .40, .136, .035);
  box(trim, dark, 0, belt - .175, -l - .07, .25, .027, .011);
  if (sport) {
    box(coat, body, 0, belt + .25, -l + .24, 2 * w, .082, .34);
    for (const side of [-1, 1]) box(trim, dark, side * w, belt + .252, -l + .24, .034, .14, .38);
  }
  if (kind === 'taxi') {
    box(trim, dark, 0, roof + .075, -.27, .66, .09, .36);
    box(lights, 0xffcf49, 0, roof + .164, -.27, .55, .16, .28);
  }

  const wheel = new THREE.Group();
  // A low-poly tire profile and flat inset spokes keep the full wheel affordable at distance.
  const tread = sport ? .266 : .23;
  const circle = (x, radius, i) => {
    const angle = i * Math.PI / 7;
    return [x, Math.cos(angle) * radius, Math.sin(angle) * radius];
  };
  const cross = [[-tread * .61, 0, 0x343945], [-tread * .61, r * .54, 0x404853],
    [-tread * .59, r * .55, 0x404853], [-tread * .56, r * .70, 0xacb1b7], [-tread * .52, r * .92, 0x292d36],
    [-tread * .34, r, 0x262a34], [tread * .34, r, 0x333640],
    [tread * .52, r * .92, 0x272b34], [tread * .56, r * .70, 0xacb1b7], [tread * .59, r * .55, 0x404853], [tread * .61, r * .54, 0x343945], [tread * .61, 0, 0]];
  for (let j = 1; j < cross.length; j++) {
    const [xa, ra] = cross[j - 1], [xb, rb, color] = cross[j];
    for (let i = 0; i < 14; i++) {
      const radial = circle(0, 1, i + .5);
      panel(wheel, rb === 0 ? 0x404853 : color, circle(xa, ra, i), circle(xa, ra, i + 1), circle(xb, rb, i + 1), circle(xb, rb, i), [ra === rb ? 0 : Math.sign(ra - rb), radial[1] * .3, radial[2] * .3]);
    }
  }
  for (const side of [-1, 1]) {
    const x = side * tread * .632;
    for (let i = 0; i < 5; i++) {
      const a = i * 14 / 5;
      const ringPoint = (radius, angle) => circle(x, radius * r, a + angle);
      panel(wheel, 0xcdd0cf, ringPoint(.10, -.52), ringPoint(.55, -.18), ringPoint(.55, .18), ringPoint(.10, .52), [side, 0, 0]);
    }
    for (let i = 0; i < 7; i++) {
      const hub = (angle) => circle(x * 1.015, r * .185, angle);
      const center = [x * 1.015, 0, 0];
      panel(wheel, 0xa4a9b4, hub(i * 2), hub(i * 2 + 2), center, center, [side, 0, 0]);
    }
  }
  const mounts = [-1, 1].flatMap(side => [-1, 1].map(end => ({ x: side * (w - .057), y: r, z: axle * end, front: end > 0 })));
  const model = { layers: [[merge(coat.children), null], [merge(trim.children), matte], [merge(windows.children), glass],
    [merge(lights.children), shine], [merge(tails.children), shine]], wheel: merge(wheel.children), wheelMaterial: matte, mounts, radius: r, roof, width: w, length: l };
  templates.set(kind, model);
  return model;
}

const shadowPixels = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
  const offset = (y * 32 + x) * 4;
  const r = Math.hypot((x - 15.5) / 15.5, (y - 15.5) / 15.5);
  shadowPixels.set([255, 255, 255, Math.round(186 * Math.max(0, 1 - r ** 3) ** 1.8)], offset);
}
const shadowMap = new THREE.DataTexture(shadowPixels, 32, 32);
shadowMap.magFilter = shadowMap.minFilter = THREE.LinearFilter;
shadowMap.needsUpdate = true;
export const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x211823, map: shadowMap, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
export const shadowGeometry = new THREE.PlaneGeometry(2.7, 5.6).rotateX(-Math.PI / 2).translate(0, .041, 0);

export function buildCarModel(kind, root, color) {
  const model = carTemplate(kind), paint = carPaint();
  paint.color.setHex(color);
  const brake = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
  model.layers.forEach(([geometry, material], i) => {
    const mesh = new THREE.Mesh(geometry, i === 4 ? brake : material ?? paint);
    mesh.castShadow = i < 2; mesh.receiveShadow = i < 3; root.add(mesh);
  });
  root.add(new THREE.Mesh(shadowGeometry, shadowMaterial));
  const wheels = model.mounts.map(({ x, y, z, front }) => {
    const mount = new THREE.Group(), wheel = new THREE.Mesh(model.wheel, model.wheelMaterial);
    mount.position.set(x, y, z); mount.add(wheel); root.add(mount);
    wheel.name = 'wheel'; wheel.castShadow = true;
    return { mount, wheel, front };
  });
  return { model, wheels, paint, brake, roll(distance, steering = 0) {
    for (const { mount, wheel, front } of wheels) {
      if (front) mount.rotation.y = steering;
      wheel.rotation.x = (wheel.rotation.x + distance / model.radius) % (2 * Math.PI);
    }
  } };
}
