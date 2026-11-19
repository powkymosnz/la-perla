import { BLOCK, STEP, LIMIT, FIRST_BLOCK } from './city.js';
import { BEACH, SHORE, PIER_START, PIER_END, PIER_Z, WHEEL_X, PIER_WIDTH } from './coast.js';

// Draw streets and the waterfront from the same dimensions used to build the world.
export function createMinimap(canvas) {
  const ctx = canvas.getContext('2d');
  const center = canvas.width / 2;
  const scale = canvas.width / 420;
  return (player, world, waypoint) => {
    const x = value => center + (value - player.target.x) * scale;
    const z = value => center + (value - player.target.z) * scale;
    const rect = (color, left, top, width, depth) => {
      ctx.fillStyle = color;
      ctx.fillRect(x(left), z(top), width * scale, depth * scale);
    };
    const dot = (px, pz, color, radius) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, pz, radius, 0, Math.PI * 2);
      ctx.fill();
    };
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, center - 1, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = '#244e60';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    rect('#77758a', -LIMIT - 10, -LIMIT - 10, LIMIT * 2 + 20, LIMIT * 2 + 20);
    rect('#cbac73', BEACH, -750, SHORE - BEACH, 1500);
    rect('#ffe0a2', SHORE - 3, -750, 3, 1500);
    for (let bx = FIRST_BLOCK; bx < LIMIT; bx += STEP) {
      for (let bz = FIRST_BLOCK; bz < LIMIT; bz += STEP) {
        rect('#40394d', bx - BLOCK / 2, bz - BLOCK / 2, BLOCK, BLOCK);
      }
    }
    rect('#d8a587', PIER_START, PIER_Z - PIER_WIDTH / 2, PIER_END - PIER_START, PIER_WIDTH);
    ctx.strokeStyle = '#fff2db';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(x(WHEEL_X), z(PIER_Z), 4, 0, Math.PI * 2);
    ctx.moveTo(x(WHEEL_X) - 4, z(PIER_Z));
    ctx.lineTo(x(WHEEL_X) + 4, z(PIER_Z));
    ctx.stroke();
    for (const { root } of world.traffic) if (root.visible) dot(x(root.position.x), z(root.position.z), '#dfbe84', 1.5);
    for (const { root } of world.police) dot(x(root.position.x), z(root.position.z), '#ff6875', 2.5);
    if (world.helicopter) {
      const { position } = world.helicopter.root;
      dot(x(position.x), z(position.z), '#fa9d71', 3);
    }
    if (waypoint) {
      const dx = x(waypoint.x) - center, dz = z(waypoint.z) - center;
      const ratio = Math.min(1, (center - 8) / (Math.hypot(dx, dz) || 1));
      ctx.save();
      ctx.translate(center + dx * ratio, center + dz * ratio);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffe05d';
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(-player.heading);
    ctx.fillStyle = '#fff3e2';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-3.5, -3.5);
    ctx.lineTo(3.5, -3.5);
    ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = '#ffd8ac';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center, center, center - 2, 0, Math.PI * 2);
    ctx.stroke();
  };
}

// Day 5: road-bound civilian proxies keep the existing minimap actor contract.
