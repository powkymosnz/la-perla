import { createRender } from './render.js';
import { createWorld } from './world.js';
import { createCar } from './vehicles.js';
import { createPlayer } from './player.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createMinimap } from './minimap.js';
import { createMissions } from './missions.js';
import { loadGame, newGame, saveGame, SLOTS } from './save.js';
import { createGarage, SERVICES } from './garage.js';
import { createRadio } from './radio.js';
import { createCombat } from './combat.js';
import { missions as jobs } from './story.js';

const select = selector => document.querySelector(selector);
const intro = select('#intro');
try { start(); } catch (error) {
  intro.querySelectorAll('button').forEach(button => { button.disabled = true; });
  intro.querySelector('article > p:last-of-type').textContent = 'LA PERLA could not start. Try a browser with WebGL enabled.';
  console.error(error);
}

function start() {
  const testing = new URLSearchParams(location.search).has('test');
  let state = loadGame() ?? newGame();
  const render = createRender();
  const world = createWorld(render.scene);
  const car = createCar(render.scene);
  car.configure(state);
  const player = createPlayer(render.scene, car);
  const camera = createCamera();
  const input = createInput();
  const drawMinimap = createMinimap(select('#minimap'));
  const screen = select('#screens');
  const dialogue = select('#dialogue');
  const radio = createRadio();
  const combat = createCombat(render.scene, world, radio);
  let missions = createMissions(state);
  let mode = 'menu', currentJob = 0, toast = '', toastTime = 0;
  let lastWanted = 0, shake = 0, hitStop = 0, accumulator = 0;
  const hud = Object.fromEntries(['objective', 'file', 'radio', 'mission', 'hud', '.stars', '.cash', '.heat', '.speed',
    '.health i', '.action', '.police-status', '.compass'].map(key => [key, select(key.startsWith('.') ? key : '#' + key)]));
  function setText(key, value) {
    if (hud[key].textContent !== value) hud[key].textContent = value;
  }
  function menuButtons(panel, entries) {
    const nav = panel.querySelector('nav');
    nav.replaceChildren(...entries.map(([label, action]) => {
      const button = document.createElement('button');
      button.textContent = label;
      button.disabled = !action;
      if (action) button.onclick = () => { input.clear(); action(); };
      return button;
    }));
    nav.querySelector('button:not(:disabled)')?.focus();
  }
  function show(title, copy, entries, nextMode) {
    mode = nextMode;
    screen.hidden = false;
    screen.querySelector('h2').textContent = title;
    screen.querySelector('p').textContent = copy;
    menuButtons(screen, entries);
  }
  function play() {
    screen.hidden = dialogue.hidden = true;
    mode = 'playing';
    document.activeElement?.blur();
  }
  function title() {
    screen.hidden = dialogue.hidden = true;
    intro.hidden = false;
    mode = 'menu';
    intro.querySelector('[data-action="continue"]').disabled = !loadGame();
    intro.querySelector('[data-action="new"]').focus();
  }
  function record(slot) {
    const ok = saveGame(state, slot);
    if (!ok) notify('Save unavailable');
    return ok;
  }
  function load(snapshot) {
    state = snapshot;
    missions = createMissions(state);
    car.configure(state);
    car.repair();
    world.clearHeat();
    player.reset(596, -54, 0);
  }
  function graph(nodeId, done) {
    const node = missions.graph[nodeId];
    if (node.end) { dialogue.hidden = true; done(); return; }
    mode = 'dialogue';
    dialogue.hidden = false;
    dialogue.querySelector('strong').textContent = node.speaker;
    dialogue.querySelector('p').textContent = node.line;
    radio.speak(node.speaker, node.line);
    const choices = node.choices ?? [{ label: 'Continue', to: node.next }];
    menuButtons(dialogue, choices.map(choice => [choice.label, () => {
      if (choice.route !== undefined) missions.choose(choice.route);
      graph(choice.to, done);
    }]));
  }
  function begin(index) {
    currentJob = index;
    screen.hidden = true;
    const job = missions.start(index);
    world.clearHeat();
    car.repair();
    player.reset(...job.start);
    if (index === 1) world.resetMarketCar();
    if (index === 3) notify('El Toro · ' + radio.bark('El Toro'));
    graph('intro', () => { state.resume = { job: index }; record(); missions.launch(world); play(); });
  }
  const nextJob = () => jobs.findIndex(job => !state.completed.includes(job.title));
  function caseFiles() {
    const next = nextJob();
    show('Case files', 'Choose a job. Completed jobs can be replayed.', [
      ...jobs.map(({ title }, i) => [
        (state.completed.includes(title) ? '✓ ' : '') + title,
        testing || next < 0 || i <= next ? () => begin(i) : null,
      ]),
      ['Free drive', () => { missions.clear(); state.resume = null; record(); play(); }], ['Return to title', title],
    ], 'files');
  }
  function garageMenu() {
    const garage = createGarage(state, car, world);
    show('Rosa’s Garage', '$' + state.cash.toLocaleString() + ' available', [
      ...SERVICES.map(([id, label, price]) => [
        label + ' · $' + price + (state.upgrades[id] === undefined ? '' : ' · ' + state.upgrades[id] + '/3'),
        state.cash >= price && !(state.upgrades[id] >= 3) ? () => {
          garage.buy(id);
          record();
          radio.effect('confirm');
          garageMenu();
        } : null,
      ]),
      ['Back to the street', play],
    ], 'garage');
  }
  function slots() {
    show('Save slots', 'Save your case progress or load an earlier case file.', [
      ...SLOTS.flatMap(slot => {
        const saved = loadGame(slot);
        return [
          ['Save ' + slot, () => { if (record(slot)) slots(); }],
          [saved ? 'Load ' + slot + ' · ' + saved.completed.length + '/8' : slot + ' · empty', saved ? () => {
            load(saved);
            record();
            caseFiles();
          } : null],
        ];
      }),
      ['Back', pause],
    ], 'slots');
  }
  function pause() {
    show('Paused', 'Pick up where you left off or open your case files.', [
      ['Resume', play], ['Case files', caseFiles], ['Save slots', slots], ['Title', title],
    ], 'pause');
  }
  function notify(message) { toast = message; toastTime = 4; }
  function finish() {
    state.resume = null;
    record();
    radio.effect('confirm');
    graph('outro', () => {
      const next = nextJob();
      missions.clear();
      show(jobs[currentJob].title + ' · complete', '$' + state.cash.toLocaleString() + ' in your account.', [
        [next < 0 ? 'Case files' : 'Next job', next < 0 ? caseFiles : () => begin(next)],
        ['Rosa’s Garage', () => {
          const { x, z } = world.garagePosition;
          player.reset(x, z, Math.PI / 2);
          garageMenu();
        }],
        ['Free drive', () => { missions.clear(); state.resume = null; record(); play(); }],
      ], 'complete');
    });
  }
  for (const button of intro.querySelectorAll('[data-action]')) {
    button.onclick = () => {
      const action = button.dataset.action;
      radio.start();
      input.clear();
      intro.hidden = true;
      if (action === 'new') { load(newGame()); record(); begin(0); }
      else if (action === 'continue') {
        load(loadGame() ?? newGame());
        const next = state.resume?.job ?? nextJob();
        if (next >= 0) begin(next);
        else caseFiles();
      } else caseFiles();
    };
  }
  const resize = () => render.resize(camera.camera);
  window.addEventListener('resize', resize);
  resize();
  title();

  const step = 1 / 120;
  // Simulate controls and collisions in fixed steps, then follow the resolved position once per frame.
  let previous = performance.now(), actualTime = 0;
  function frame(now) {
    const dt = Math.min((now - previous) / 1000, .1);
    previous = now;
    actualTime += dt;
    if (input.take('Escape')) {
      if (mode === 'playing') pause();
      else if (mode === 'pause' || mode === 'garage') play();
    }
    if (mode === 'playing') {
      if (input.take('KeyR')) { radio.next(); notify('Luz · ' + radio.bark('Luz')); }
      if (input.take('KeyG') && world.nearGarage(player.target) && car.speed < 4) {
        notify('Rosa · ' + radio.bark('Rosa'));
        garageMenu();
      }
      hitStop = Math.max(0, hitStop - dt);
      if (!hitStop && mode === 'playing') accumulator += dt;
      while (accumulator >= step && mode === 'playing') {
        accumulator -= step;
        player.update(step, input, world);
        world.update(step, player, car);
        const feedback = combat.update(step, player, input);
        if (feedback) {
          shake = Math.max(shake, feedback.shake);
          if (feedback.hitStop) { hitStop = feedback.hitStop; accumulator = 0; }
        }
        if (missions.active) missions.update(step, player, world, car);
        if (missions.stage === 'complete') finish();
        if (missions.stage === 'failed') show(jobs[currentJob].title + ' · failed', car.health <= 0 ? 'The car is wrecked.' : 'Time ran out.', [
          ['Retry', () => begin(currentJob)], ['Case files', caseFiles],
        ], 'failed');
      }
      if (world.wanted >= 3 && lastWanted < 3) notify('Vega · ' + radio.bark('Vega'));
      lastWanted = world.wanted;
    } else accumulator = 0;

    const waypoint = missions.waypoint && { x: missions.waypoint[0], z: missions.waypoint[1] };
    const nearGarage = world.nearGarage(player.target) && car.speed < 4;
    const job = missions.active;
    const timer = missions.remaining === null ? '' : ' · ' + Math.ceil(missions.remaining) + 's';
    hud.hud.classList.toggle('on-foot', !player.driving);
    setText('file', job ? job.title.toUpperCase() + timer : 'FIELD FILE');
    setText('objective', nearGarage && !job ? 'G · Rosa’s Garage' : missions.objective);
    setText('.stars', '★'.repeat(world.wanted) + '☆'.repeat(5 - world.wanted));
    setText('.cash', '$' + state.cash.toLocaleString());
    setText('.heat', world.heat ? 'HEAT · HOT CAR' : '');
    setText('.speed', Math.round(car.speed * 3.6) + ' KM/H');
    const health = Math.round(car.health * 100);
    hud['.health i'].style.setProperty('--health', health + '%');
    toastTime -= dt;
    setText('.action', player.carjacking ? 'PULLING DRIVER' : toastTime > 0 ? toast : nearGarage ? 'G · GARAGE' : '');
    setText('radio', player.driving ? radio.label + ' · LUZ ON AIR' : combat.label + ' · 1/2 select · F attack');
    const closest = Math.min(...world.police.map(unit => unit.distance));
    setText('.police-status', world.wanted ? [world.police.length + ' PATROL', Number.isFinite(closest) ? Math.round(closest) + ' m' : '', world.helicopter ? 'AIR SUPPORT' : world.unseen > 0 ? 'SEARCHING' : 'IN PURSUIT'].filter(Boolean).join(' · ') : '');
    hud.hud.classList.toggle('wanted', world.wanted > 0);
    if (waypoint) {
      const dx = waypoint.x - player.target.x, dz = waypoint.z - player.target.z;
      const angle = Math.atan2(dx, dz) - player.heading;
      const arrows = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'];
      const bearing = (Math.round(angle / (Math.PI / 4)) + 16) % 8;
      setText('.compass', arrows[bearing] + ' ' + job.district + ' · ' + Math.round(Math.hypot(dx, dz)) + ' m');
    } else setText('.compass', 'N · LA PERLA');
    drawMinimap(player, world, waypoint);
    camera.follow(dt, player, car, world);
    // Compact ambient instance buffers against the resolved camera, once per rendered frame.
    world.animate(dt, camera.camera);
    const trauma = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : shake * shake;
    camera.camera.position.x += trauma * Math.sin(actualTime * 71) * .45;
    camera.camera.position.y += trauma * Math.sin(actualTime * 83) * .3;
    shake = Math.max(0, shake - dt * 2.6);
    render.draw(camera.camera, player.target);
    requestAnimationFrame(frame);
  }
  if (testing) {
    window.__laPerla = {
      world, car, player, radio, render,
      get state() { return state; }, get missions() { return missions; }, get mode() { return mode; },
    };
  }
  requestAnimationFrame(frame);
}
