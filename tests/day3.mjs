import assert from 'node:assert/strict';
// Story and save mechanics run here independently of the renderer and the city meshes.
import { createMissions } from '../game/src/missions.js';
import { missions, dialogue } from '../game/src/story.js';
import { loadGame, saveGame, newGame } from '../game/src/save.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
};
assert.equal(loadGame(), null);
const state = newGame();
assert(saveGame(state));
state.cash = 1950;
state.upgrades.engine = 1;
saveGame(state, 'Slot 1');
assert.equal(loadGame('Slot 1').cash, 1950);
assert.equal(loadGame().cash, 2450, 'manual slot preserves autosave');
storage.set('la-perla-save-v1', '{broken');
assert.equal(loadGame().cash, 2450, 'corrupt bank falls back to prior bank');
storage.clear();
storage.set('la-perla-save-v1', JSON.stringify({ version: 1, cash: 750, completed: [], upgrades: { engine: 0, handling: 0 }, color: 0xda4f3e }));
assert.equal(loadGame().cash, 750, 'Day 3 v1 migrates');
storage.set('la-perla-save-v1', JSON.stringify({ version: 2, auto: { ...state, cash: -1 }, slots: {} }));
assert.equal(loadGame(), null, 'invalid money is rejected');

for (const graph of dialogue) {
  for (const [id, node] of Object.entries(graph)) {
    assert(node.end || node.next || node.choices?.length, 'dead end: ' + id);
    for (const to of [...(node.next ? [node.next] : []), ...(node.choices ?? []).map(choice => choice.to)])
      assert(graph[to], 'missing dialogue target: ' + to);
  }
  for (const start of ['intro', 'outro']) for (const branch of [0, 1]) {
    let node = graph[start], steps = 0;
    while (!node.end && steps++ < 10) node = graph[node.next ?? node.choices[branch % node.choices.length].to];
    assert(node.end, 'every dialogue branch terminates');
  }
}
for (let index = 0; index < missions.length; index++) for (const route of [0, 1]) {
  const state = newGame();
  const runner = createMissions(state);
  const world = { wanted: 0, thefts: 0, raiseWanted(n) { this.wanted = n; } };
  const player = { target: {}, driving: true };
  const car = { health: 1 };
  runner.start(index);
  runner.choose(route);
  runner.launch(world);
  const cash = state.cash;
  const go = () => {
    const [x, z] = runner.waypoint;
    player.target = { x, z };
    runner.update(1 / 120, player, world, car);
  };
  if (index === 1) {
    go();
    assert.equal(runner.stage, 'steal', 'arrival alone does not replace theft');
    world.thefts++;
    go();
  }
  if (missions[index].pickup) {
    go();
    assert.equal(runner.stage, 'playing');
    assert.equal(world.wanted, 3);
  }
  if (index === 1 || index === 5 || (index === 7 && route)) {
    world.wanted = 2;
    go();
    assert.notEqual(runner.stage, 'complete', 'arrival while pursued cannot finish escape');
    world.wanted = 0;
  }
  if (index === 7 && route) player.driving = false;
  go();
  assert.equal(runner.stage, 'complete', missions[index].title + ' route ' + route);
  assert.equal(state.cash, cash + missions[index].reward);
  runner.update(0, player, world, car);
  assert.equal(state.cash, cash + missions[index].reward, 'reward is idempotent');
}
const failure = createMissions(newGame());
failure.start(0);
failure.launch({ thefts: 0 });
failure.update(99, { target: { x: 0, z: 0 } }, {}, { health: 1 });
assert.equal(failure.stage, 'failed');
console.log('PASS: 16 mission routes, dialogue branches, timer failure, save migration/validation/backup and independent slots.');

const { createMinimap } = await import('../game/src/minimap.js');
const { BLOCK, STEP } = await import('../game/src/city.js');
const { BEACH, SHORE, PIER_START, PIER_END, PIER_WIDTH } = await import('../game/src/coast.js');
const rectangles = [], arcs = [];
const context = new Proxy({}, {
  get: (target, key) => key === 'fillRect' ? (...args) => rectangles.push(args) :
    key === 'arc' ? (...args) => arcs.push(args) : () => {},
  set: () => true,
});
const draw = createMinimap({ width: 104, height: 104, getContext: () => context });
const actor = (x, z) => ({ root: { visible: true, position: { x, z } } });
draw({ target: { x: 600, z: 48 }, heading: 0 }, {
  traffic: [actor(598, 48)], police: [actor(600, 28)],
  helicopter: actor(608, 76),
}, { x: 732, z: 48 });
const scale = 104 / 420;
assert.equal(BLOCK, 80);
assert.equal(STEP, 100);
assert(rectangles.some(([, , width, depth]) => width === BLOCK * scale && depth === BLOCK * scale));
assert(rectangles.some(([, , width]) => width === (SHORE - BEACH) * scale));
assert(rectangles.some(([, , width, depth]) => width === (PIER_END - PIER_START) * scale && depth === PIER_WIDTH * scale));
assert(arcs.some(([, , radius]) => radius === 4), 'ferris wheel');
assert(arcs.some(([, , radius]) => radius === 1.5), 'traffic');
assert(arcs.some(([, , radius]) => radius === 2.5), 'police');
assert(arcs.some(([, , radius]) => radius === 3), 'helicopter');
console.log('PASS: minimap uses the actual block/road grid, beach/shore, pier, wheel and actor symbols.');

// Day 5 runs this mission/save suite unchanged against the denser world integration.
