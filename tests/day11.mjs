import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CASE_PRESENTATION, campaignSnapshot, fundMission, missionCall } from '../game/src/presentation.js';
import { missions as jobs } from '../game/src/story.js';
import { createMissions } from '../game/src/missions.js';
import { newGame } from '../game/src/save.js';
import { createDenseHud, CREW_ABILITIES, vitalLevels } from '../game/src/hud.js';

// Case snapshots supply QA progression, while the live HUD reads real model values.
assert.equal(CASE_PRESENTATION.length, jobs.length);
assert.equal(new Set(CASE_PRESENTATION.map(caseFile => caseFile.cash)).size, jobs.length);
assert.equal(new Set(CASE_PRESENTATION.map(caseFile => caseFile.line)).size, jobs.length);
for (let index = 0; index < jobs.length; index++) {
  const caseFile = CASE_PRESENTATION[index];
  assert.ok(caseFile.cash >= 5000 && caseFile.cash <= 19000, jobs[index].title + ' has progressed cash');
  assert.ok(caseFile.health >= 70 && caseFile.health <= 100);
  assert.ok(caseFile.armour >= 0 && caseFile.armour <= 100);
  assert.ok(caseFile.respect >= 0 && caseFile.respect <= 100);
  assert.deepEqual(missionCall(index), { speaker: caseFile.speaker, line: caseFile.line });
  const snapshot = campaignSnapshot(index);
  assert.equal(snapshot.cash, caseFile.cash);
  assert.deepEqual(snapshot.completed, jobs.slice(0, index).map(job => job.title));
  assert.ok(snapshot.upgrades && Number.isInteger(snapshot.color));
  snapshot.completed.push('Unrelated mutation');
  assert.ok(!campaignSnapshot(index).completed.includes('Unrelated mutation'), 'QA snapshots are independent');
}
const shotCases = [0, 1, 6, 5];
assert.deepEqual(shotCases.map(index => missionCall(index).speaker), ['Vega', 'Rosa', 'El Toro', 'Luz']);
assert.equal(new Set(shotCases.map(index => CASE_PRESENTATION[index].health)).size, 4);

const state = newGame();
const runner = createMissions(state);
const pursuit = { wanted: 0, thefts: 0, raiseWanted(level) { this.wanted = level; } };
const driver = { target: { x: 0, z: 0 }, driving: true };
const vehicle = { health: 1 };
for (let index = 0; index < jobs.length; index++) {
  runner.start(index);
  runner.launch(pursuit);
  assert.equal(state.cash, CASE_PRESENTATION[index].cash, jobs[index].title + ' cash follows actual one-time advances and rewards');
  const cash = state.cash;
  fundMission(state, index);
  assert.equal(state.cash, cash, 'restarting a case cannot farm its advance');
  const arrive = () => {
    const [x, z] = runner.waypoint;
    driver.target = { x, z };
    runner.update(1 / 120, driver, pursuit, vehicle);
  };
  if (index === 1) { pursuit.thefts++; arrive(); }
  if (jobs[index].pickup) arrive();
  pursuit.wanted = 0;
  arrive();
  assert.equal(runner.stage, 'complete');
  assert.equal(state.cash, cash + jobs[index].reward);
}

// A minimal DOM exercises the same construction/update path used in the browser.
class Element {
  constructor() {
    this.textContent = '';
    this.children = [];
    this.attributes = new Map();
    this.properties = new Map();
    this.style = { setProperty: (name, value) => this.properties.set(name, value) };
    this.classes = new Set();
    this.classList = { toggle: (name, value) => value ? this.classes.add(name) : this.classes.delete(name) };
    this.descendants = new Map();
  }
  append(...children) { this.children.push(...children); }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector(selector) {
    if (!this.descendants.has(selector)) this.descendants.set(selector, new Element());
    return this.descendants.get(selector);
  }
}
const nodes = new Map();
globalThis.document = {
  createElement: () => new Element(),
  querySelector(selector) {
    if (!nodes.has(selector)) nodes.set(selector, new Element());
    return nodes.get(selector);
  },
};
const combat = { active: 2, slots: [
  { name: 'Fists', ammo: Infinity }, { name: 'Pistol', ammo: 72 },
  { name: 'SMG', ammo: 150 }, { name: 'Shotgun', ammo: 24 }, { name: 'Carbine', ammo: 90 },
] };
const hud = createDenseHud(combat);
assert.equal(nodes.get('#weapons').children.length, 5);
const crew = nodes.get('#crew-abilities').children;
assert.equal(crew.length, 3);
assert.deepEqual(CREW_ABILITIES.map(ability => ability.action), ['SWAP PLATES', 'QUICK FIX', 'EYES OUT']);
assert.deepEqual(crew.map(row => row.children[0].textContent), CREW_ABILITIES.map(ability => ability.action));
assert.deepEqual(crew.map(row => row.children[1].textContent), CREW_ABILITIES.map(ability => ability.name + ' · ' + ability.role.toUpperCase()));

const world = { police: [], wanted: 4, unseen: 0 };
const player = { target: { x: 600, z: 120 }, driving: true };
const mission = { progress: { current: 2, total: 3, next: 'Escape the response' }, remaining: 24, active: {}, elapsed: 6 };
for (const index of shotCases) {
  const caseFile = CASE_PRESENTATION[index];
  const call = missionCall(index);
  hud.call(call.speaker, call.line);
  hud.update(.2, true, mission, world, { health: .62, gear: '4' }, player,
    { clock: '18:45', label: 'GOLDEN HOUR · CLEAR' }, caseFile);
  assert.equal(nodes.get('#comms').querySelector('p').textContent, call.line);
  assert.equal(nodes.get('#comms').hidden, false);
  for (const name of ['health', 'armour', 'respect']) {
    assert.equal(nodes.get('.' + name + ' i').properties.get('--vital'), caseFile[name] + '%');
    assert.equal(nodes.get('.' + name + ' i').attributes.get('aria-valuenow'), String(caseFile[name]));
    assert.equal(nodes.get('#' + name + '-value').textContent, String(caseFile[name]));
  }
  assert.match(nodes.get('#condition').textContent, /62%.*DENTED/);
  assert.ok(Number(nodes.get('#health-value').textContent) >= 70, 'personal health is independent of vehicle damage');
}
hud.update(.2, true, mission, world, { health: 1, gear: '4' }, player, null, { health: 100, armour: 50, respect: 75 });
assert.match(nodes.get('#condition').textContent, /100%.*CLEAN/);
assert.deepEqual(vitalLevels({ health: -4, armour: 141, respect: Number.NaN }), { health: 0, armour: 100, respect: 0 });

const html = readFileSync(new URL('../game/index.html', import.meta.url), 'utf8');
for (const name of ['health', 'armour', 'respect']) {
  assert.match(html, new RegExp('class="' + name + '"[^>]*>[^<]*<i role="progressbar"'));
  assert.match(html, new RegExp('id="' + name + '-value"'));
}
assert.match(html, /id="crew"/);
assert.match(html, /ROSA DELGADO · FIXER/);
assert.match(html, /id="crew-abilities"/);
console.log('PASS: eight unique case balances and mission calls, independent QA snapshots, distinct screenshot contacts/vitals, real armour/respect HUD bars, crew cards and vehicle condition labels.');
