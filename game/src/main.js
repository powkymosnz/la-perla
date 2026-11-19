import { createRender } from './render.js';
import { createWorld } from './world.js';
import { createCar } from './vehicles.js';
import { createPlayer } from './player.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';

const intro = document.querySelector('#intro');
const button = intro.querySelector('button');
try {
  start();
} catch (error) {
  button.disabled = true;
  intro.querySelector('article > p:last-of-type').textContent = 'LA PERLA could not start. Try a browser with WebGL enabled.';
  console.error(error);
}

function start() {
  const render = createRender();
  const world = createWorld(render.scene);
  const car = createCar(render.scene);
  const player = createPlayer(render.scene, car);
  const camera = createCamera();
  const input = createInput();
  const hud = document.querySelector('#hud');
  const minimap = document.querySelector('#minimap');
  const minimapContext = minimap.getContext('2d');
  const mission = document.querySelector('#mission');
  const objective = document.querySelector('#objective');
  let lastWanted = 0;
  let missionFlash = 0;
  const resize = () => render.resize(camera.camera);
  window.addEventListener('resize', resize);
  resize();

  button.addEventListener('click', () => {
    button.blur();
    intro.hidden = true;
    missionFlash = 2.5;
    input.take('KeyE');
  });

  // Use fixed simulation steps for consistent handling across displays.
  const step = 1 / 120;
  let previous = performance.now();
  let accumulator = 0;
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .25);
    previous = now;
    if (intro.hidden) {
      accumulator += dt;
      while (accumulator >= step) {
        player.update(step, input, world);
        world.update(step, player, car);
        accumulator -= step;
      }
    }
    if (world.wanted !== lastWanted) {
      lastWanted = world.wanted;
      missionFlash = 1;
      objective.textContent = lastWanted ? 'Lose the police · switch cars to clear heat' : 'Reach the boulevard · find a way through';
    }
    if (!player.driving && world.canCarjack(player.target)) objective.textContent = 'E · pull the driver and take this car';
    else if (!player.driving && !world.wanted) objective.textContent = 'E · return to your coupe';
    missionFlash = Math.max(0, missionFlash - dt);
    mission.classList.toggle('flash', missionFlash > 0);
    mission.classList.toggle('compact', missionFlash === 0);
    hud.classList.toggle('wanted', world.wanted > 0);
    hud.querySelector('.stars').textContent = world.wanted ? '★'.repeat(world.wanted) + '☆'.repeat(5 - world.wanted) : '';
    hud.querySelector('.cash').textContent = `$${world.cash.toLocaleString()}`;
    hud.querySelector('.heat').textContent = world.heat > .1 ? 'HEAT · HOT CAR' : '';
    hud.querySelector('.speed').textContent = `${Math.round(car.speed * 5.4)} KM/H`;
    hud.dataset.mode = player.driving ? 'driving' : 'on-foot';
    hud.dataset.action = player.carjacking ? 'carjacking' : player.driving ? 'driving' : 'on-foot';
    hud.dataset.helicopter = world.helicopter ? 'visible' : 'absent';
    hud.dataset.spikes = world.spikes ? 'deployed' : 'absent';
    hud.querySelector('.action').textContent = player.carjacking ? 'PULLING DRIVER' : '';
    hud.querySelector('.police-status').textContent = world.wanted ? `${world.police.length} UNIT${world.police.length === 1 ? '' : 'S'} · ${world.wanted >= 3 ? 'ROADBLOCKS' : 'PURSUIT'}` : '';
    hud.querySelector('.compass').textContent = `${['N','NE','E','SE','S','SW','W','NW'][Math.round((player.heading / Math.PI * 4 + 8) % 8)]}  ·  OLD TOWN  ›  PORT`;
    minimapContext.clearRect(0, 0, 104, 104);
    minimapContext.strokeStyle = '#ffd8ac'; minimapContext.lineWidth = 2; minimapContext.beginPath(); minimapContext.arc(52, 52, 50, 0, Math.PI * 2); minimapContext.stroke();
    const drawDot = (x, z, color, size = 3) => { const dx = Math.max(-44, Math.min(44, (x - player.target.x) * .18)); const dz = Math.max(-44, Math.min(44, (z - player.target.z) * .18)); minimapContext.fillStyle = color; minimapContext.beginPath(); minimapContext.arc(52 + dx, 52 + dz, size, 0, Math.PI * 2); minimapContext.fill(); };
    for (const item of world.traffic) if (item.root.visible) drawDot(item.root.position.x, item.root.position.z, '#edc078', 2);
    for (const unit of world.police) drawDot(unit.root.position.x, unit.root.position.z, '#ff6875', 3);
    drawDot(player.target.x, player.target.z, '#ffc198', 4);
    world.animate(dt);
    camera.follow(dt, player, car, world);
    render.draw(camera.camera, player.target);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
