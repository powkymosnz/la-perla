import { missions as jobs } from './story.js';

// Case retainers are real, one-time payments. The same campaign state is used by
// the live HUD, saves and QA captures; the cash readout has no presentation override.
const advances = [3350, 2100, 350, 200, 200, 400, 200, 200];
const calls = [
  ['Vega', 'Fuentes! The old gates are sealed. You will not outrun this city.'],
  ['Rosa', 'Keep it moving through Mercado Sol. My garage has a clean set of plates.'],
  ['Diego', 'Package secured. Taking the seawall before the harbor closes.'],
  ['El Toro', 'The strip belongs to whoever crosses it first. Show me, Diego.'],
  ['Rosa', 'Cargo is aboard. Take the marina road; I will cover the handoff.'],
  ['Luz', 'Luz live from the towers: blue lights below, one red comet getting away.'],
  ['El Toro', 'Vega owns the barricade. We own the road beyond it. Punch through!'],
  ['Luz', 'Last call, La Perla. There is still one boat waiting beyond the sirens.'],
];
const health = [96, 88, 94, 91, 84, 79, 72, 82];
const condition = [1, .87, .95, .9, .83, .92, .62, .76];
let balance = 2450;
export const CASE_PRESENTATION = Object.freeze(jobs.map((job, index) => {
  balance += advances[index];
  const item = Object.freeze({ cash: balance, speaker: calls[index][0], line: calls[index][1],
    health: health[index], armour: 82 - index * 6, respect: 18 + index * 10,
    condition: condition[index], advance: advances[index] });
  balance += job.reward;
  return item;
}));

export function missionCall(index) {
  const item = CASE_PRESENTATION[index];
  if (!item) throw new RangeError('Unknown case file');
  return { speaker: item.speaker, line: item.line };
}

export function fundMission(state, index) {
  const job = jobs[index], item = CASE_PRESENTATION[index];
  if (!job || !item) throw new RangeError('Unknown case file');
  const funded = Array.isArray(state.funded) ? state.funded : [];
  if (state.completed.includes(job.title) || funded.includes(job.title)) return 0;
  state.funded = [...funded, job.title];
  state.cash += item.advance;
  return item.advance;
}

// Reproducible save-like snapshots for the existing ?test QA interface only.
// Every balance equals prior case rewards plus the already-paid case retainers.
export function campaignSnapshot(index) {
  const item = CASE_PRESENTATION[index];
  if (!item) throw new RangeError('Unknown case file');
  return { cash: item.cash, completed: jobs.slice(0, index).map(job => job.title),
    funded: jobs.slice(0, index + 1).map(job => job.title),
    upgrades: { engine: 0, handling: 0 }, color: 0xcf182b,
    health: item.health, armour: item.armour, respect: item.respect };
}
