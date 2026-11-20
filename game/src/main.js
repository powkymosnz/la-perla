import { createRender } from './render.js';
import { createEnvironment, testConditions, TIMES, WEATHER } from './environment.js';
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
import { createDenseHud, setContact } from './hud.js';
import { campaignSnapshot, CASE_PRESENTATION, missionCall } from './presentation.js';

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
  const environment = createEnvironment(render.scene, render, car);
  const initialConditions = testConditions(location.search);
  environment.set(initialConditions.time, initialConditions.weather);
  car.configure(state);
  const player = createPlayer(render.scene, car);
  const camera = createCamera();
  const input = createInput();
  const drawMinimap = createMinimap(select('#minimap'));
  const screen = select('#screens');
  const dialogue = select('#dialogue');
  const radio = createRadio();
  const combat = createCombat(render.scene, world, radio);
  const denseHud = createDenseHud(combat);
  let missions = createMissions(state);
  let mode = 'menu', currentJob = 0, toast = '', toastTime = 0;
  let lastWanted = 0, shake = 0, hitStop = 0, accumulator = 0;
  let vitals = { health: state.health ?? 100, armour: state.armour ?? 80, respect: state.respect ?? state.completed.length * 11 + 12 };
  let previousCondition = car.health;
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
    Object.assign(state, vitals);
    const ok = saveGame(state, slot);
    if (!ok) notify('Save unavailable');
    return ok;
  }
  function load(snapshot) {
    state = snapshot;
    missions = createMissions(state);
    car.configure(state);
    car.repair();
    combat.reset();
    vitals = { health: state.health ?? 100, armour: state.armour ?? 80, respect: state.respect ?? state.completed.length * 11 + 12 };
    previousCondition = car.health;
    world.clearHeat();
    player.reset(596, -54, 0);
  }
  function graph(nodeId, done) {
    const node = missions.graph[nodeId];
    if (node.end) { dialogue.hidden = true; done(); return; }
    mode = 'dialogue';
    dialogue.hidden = false;
    setContact(dialogue, node.speaker, node.line);
    denseHud.call(node.speaker, node.line);
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
    previousCondition = car.health;
    lastWanted = 0;
    player.reset(...job.start);
    if (index === 1) world.resetMarketCar();
    if (index === 3) notify('El Toro · ' + radio.bark('El Toro'));
    graph('intro', () => {
      state.resume = { job: index };
      missions.launch(world);
      record();
      play();
      liveCall();
    });
  }
  function liveCall() {
    const { speaker, line } = missionCall(currentJob);
    denseHud.call(speaker, line);
    radio.speak(speaker, line);
    notify(speaker + ' · ' + line);
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
  function conditionsMenu() {
    const current = environment.state;
    show('Time & weather', current.label + ' · Choose the conditions for your drive.', [
      ...Object.entries(TIMES).map(([id, preset]) => [preset.label + (id === current.time ? ' ✓' : ''), () => {
        environment.set(id, current.weather); conditionsMenu();
      }]),
      ...WEATHER.map(id => [id.toUpperCase() + (id === current.weather ? ' ✓' : ''), () => {
        environment.set(current.time, id); conditionsMenu();
      }]),
      ['Back to the street', play],
    ], 'conditions');
  }
  function pause() {
    show('Paused', 'Pick up where you left off or open your case files.', [
      ['Resume', play], ['Time & weather', conditionsMenu], ['Case files', caseFiles], ['Save slots', slots], ['Title', title],
    ], 'pause');
  }
  function notify(message) {
    toast = message; toastTime = 4;
    const [speaker, ...line] = message.split(' · ');
    if (line.length && ['Rosa', 'Vega', 'Luz', 'El Toro'].includes(speaker)) denseHud.call(speaker, line.join(' · '));
  }
  function cameraToast() { notify('CAMERA · ' + camera.modeName); }
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
      else if (mode === 'pause' || mode === 'garage' || mode === 'conditions') play();
    }
    if (mode === 'playing') {
      if (input.take('KeyC') && player.driving) {
        camera.cycle();
        cameraToast();
      }
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
      if (world.wanted >= 3 && lastWanted < 3) liveCall();
      lastWanted = world.wanted;
    } else accumulator = 0;

    const waypoint = missions.waypoint && { x: missions.waypoint[0], z: missions.waypoint[1] };
    const nearGarage = world.nearGarage(player.target) && car.speed < 4;
    const job = missions.active;
    hud.hud.classList.toggle('on-foot', !player.driving);
    setText('file', job ? job.title.toUpperCase() : 'LA PERLA · FIELD FILE');
    setText('objective', nearGarage && !job ? 'G · Rosa’s Garage' : missions.objective);
    setText('.stars', '★'.repeat(world.wanted) + '☆'.repeat(5 - world.wanted));
    setText('.cash', '$' + state.cash.toLocaleString());
    setText('.heat', world.heat ? 'HEAT · HOT CAR' : '');
    setText('.speed', Math.round(player.speed * 3.6) + '');
    const impact = Math.max(0, previousCondition - car.health) * 35;
    const absorbed = Math.min(vitals.armour, impact);
    vitals.armour -= absorbed;
    vitals.health = Math.max(0, vitals.health - impact + absorbed);
    vitals.respect = Math.max(vitals.respect, Math.min(100, 12 + state.completed.length * 11));
    previousCondition = car.health;
    toastTime -= dt;
    setText('.action', player.carjacking ? 'PULLING DRIVER' : toastTime > 0 ? toast : nearGarage ? 'G · GARAGE' : '');
    setText('radio', player.driving ? '♫ ' + radio.label.toUpperCase() + ' · R TUNE' : combat.label + ' · 1–5 SELECT · F ATTACK');
    const closest = Math.min(...world.police.map(unit => unit.distance));
    setText('.police-status', world.wanted ? [world.unseen > 0 ? 'SEARCHING' : 'DISPATCH / ACTIVE', Number.isFinite(closest) ? Math.round(closest) + ' m CLOSEST' : 'DEPLOYING'].join(' · ') : '');
    hud.hud.classList.toggle('wanted', world.wanted > 0);
    if (waypoint) {
      const dx = waypoint.x - player.target.x, dz = waypoint.z - player.target.z;
      const angle = Math.atan2(dx, dz) - player.heading;
      const arrows = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'];
      const bearing = (Math.round(angle / (Math.PI / 4)) + 16) % 8;
      setText('.compass', arrows[bearing] + ' ' + job.district + ' · ' + Math.round(Math.hypot(dx, dz)) + ' m');
    } else setText('.compass', 'N · LA PERLA');
    denseHud.update(dt, mode === 'playing', missions, world, car, player, environment.state, vitals);
    drawMinimap(player, world, waypoint);
    const trauma = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : shake * shake;
    camera.follow(dt, player, car, world, trauma * Math.sin(actualTime * 71) * .45, trauma * Math.sin(actualTime * 83) * .3);
    // Compact ambient instance buffers against the resolved camera, once per rendered frame.
    world.animate(dt, camera.camera);
    shake = Math.max(0, shake - dt * 2.6);
    environment.update(mode === 'playing' ? dt : 0, player.target);
    render.draw(camera.camera, player.target);
    requestAnimationFrame(frame);
  }
  if (testing) {
    Object.defineProperty(window, '__laPerla', { value: Object.freeze({
      world, car, player, radio, render, combat,
      camera: Object.freeze({
        get mode() { return camera.mode; },
        get modeName() { return camera.modeName; },
        get modes() { return camera.modes; },
        get position() { return Object.freeze(camera.camera.position.toArray()); },
        setMode: value => camera.setMode(value),
      }),
      get conditions() { return environment.state; },
      get state() { return state; }, get missions() { return missions; }, get mode() { return mode; },
      stageCase(index) {
        const snapshot = campaignSnapshot(index);
        load(snapshot);
        currentJob = index;
        missions.start(index);
        missions.choose(0);
        missions.launch(world);
        intro.hidden = true;
        lastWanted = 0;
        car.takeDamage(1 - CASE_PRESENTATION[index].condition);
        previousCondition = car.health;
        play();
        liveCall();
        return { cash: state.cash, ...missionCall(index) };
      },
    }), writable: false, configurable: false });
  }
  requestAnimationFrame(frame);
}
