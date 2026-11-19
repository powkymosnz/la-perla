import { barks } from './story.js';

// Each station is synthesized from its own timing, scale, and oscillator shape.
const stations = [
  { label: 'Sol 101.9', bpm: 114, wave: 'triangle', notes: [110, 130.81, 164.81, 196], rhythm: [0, 2, 4, 6] },
  { label: 'Lagoon FM', bpm: 96, wave: 'sawtooth', notes: [82.41, 110, 123.47, 164.81], rhythm: [0, 3, 4, 7] },
  { label: 'Celeste 98.1', bpm: 124, wave: 'sine', notes: [98, 123.47, 146.83, 196], rhythm: [0, 2, 3, 5, 7] },
];

export function createRadio() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  let context, master, music, duck, sfx, station = 0, step = 0, next = 0, duckTimer;
  function tone(bus, type, frequency, peak, duration, now, drop = 1) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(frequency * drop, now + duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    osc.connect(gain).connect(bus);
    osc.start(now);
    osc.stop(now + duration + .01);
  }
  function start() {
    if (!Audio) return;
    if (context) { context.resume().catch(() => {}); return; }
    context = new Audio();
    master = context.createGain();
    master.gain.value = .22;
    master.connect(context.destination);
    sfx = context.createGain();
    sfx.gain.value = .7;
    sfx.connect(master);
    music = context.createGain();
    music.gain.value = .65;
    duck = context.createGain();
    duck.connect(music).connect(master);
    context.resume().catch(() => {});
    setInterval(() => {
      if (context.state !== 'running') return;
      const { bpm, wave, notes, rhythm } = stations[station];
      if (next < context.currentTime) next = context.currentTime + .025;
      while (next < context.currentTime + .13) {
        if (rhythm.includes(step % 8)) tone(duck, wave, notes[(step >> 1) % notes.length] * (step % 4 ? 2 : 1), .15, .25, next);
        if (step % 4 === 0) tone(duck, 'sine', 118, .23, .16, next, .4);
        if (step % 2) tone(duck, 'triangle', station === 2 ? 760 : 2200, .045, .05, next, .65);
        next += 30 / bpm;
        step++;
      }
    }, 45);
  }
  return {
    start,
    next() { station = (station + 1) % stations.length; step = 0; },
    get status() { return { state: context?.state ?? 'off', duck: duck?.gain.value ?? 1, station }; },
    get label() { return stations[station].label; },
    speak(speaker, line) {
      if (!duck) return;
      clearTimeout(duckTimer);
      duck.gain.setTargetAtTime(.23, context.currentTime, .06);
      duckTimer = setTimeout(() => duck.gain.setTargetAtTime(1, context.currentTime, .25), Math.min(4500, line.length * 48));
    },
    bark(speaker) { return barks[speaker]; },
    effect(name) {
      if (!context) return;
      const [pitch, amplitude, duration, drop] = {
        shot: [145, .65, .15, .23], hit: [94, .5, .16, .5],
        swing: [360, .14, .11, .25], confirm: [523, .35, .24, 1.5],
      }[name];
      tone(sfx, name === 'confirm' ? 'sine' : 'triangle', pitch * (.95 + Math.random() * .1), amplitude, duration, context.currentTime, drop);
    },
  };
}

// Day 5: the denser city preserves all locally synthesized stations and dialogue ducking.
