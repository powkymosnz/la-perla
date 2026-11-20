import { districtNameAt } from './city.js';

// The same contact identity appears in mission conversations and live radio calls.
const contacts = {
  Rosa: ['RD', 'Rosa Delgado', 'Garage Owner', '#82444d'],
  Vega: ['CV', 'Comisario Vega', 'Police Chief', '#344c72'],
  Luz: ['LZ', 'Luz', 'Radio DJ', '#754881'],
  'El Toro': ['ET', 'El Toro', 'Rival Crew Leader', '#784629'],
  Diego: ['DF', 'Diego Fuentes', 'Wheelman', '#276467'],
};

export const CREW_ABILITIES = Object.freeze([
  Object.freeze({ name: 'Rosa Delgado', role: 'Fixer', action: 'SWAP PLATES', detail: 'Clear vehicle heat' }),
  Object.freeze({ name: 'Diego Fuentes', role: 'Wheelman', action: 'QUICK FIX', detail: 'Rosa’s garage · G' }),
  Object.freeze({ name: 'Luz', role: 'Radio DJ', action: 'EYES OUT', detail: 'Citywide lookout · R' }),
]);

export function vitalLevels(profile = {}, car = { health: 1 }) {
  const percent = value => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  return {
    health: percent(profile.health ?? car.health * 100),
    armour: percent(profile.armour ?? 0),
    respect: percent(profile.respect ?? 0),
  };
}

export function setContact(panel, speaker, line) {
  const [initials, name, role, color] = contacts[speaker] ?? contacts.Luz;
  const portrait = panel.querySelector('.portrait');
  portrait.textContent = initials;
  portrait.style.backgroundColor = color;
  portrait.setAttribute('aria-label', name + ' portrait');
  panel.querySelector('.contact-name').textContent = name;
  panel.querySelector('.contact-role').textContent = role;
  panel.querySelector('p').textContent = line;
}

export function clockLabel(seconds) {
  const minutes = (18 * 60 + 45 + Math.floor(seconds / 4)) % 1440;
  return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
}

export function timerLabel(seconds) {
  const whole = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(whole / 60)).padStart(2, '0') + ':' + String(whole % 60).padStart(2, '0');
}

export function dispatchUnits(world, target) {
  const distance = position => Math.round(Math.hypot(position.x - target.x, position.z - target.z));
  const units = world.police.map(unit => ({
    name: unit.name,
    distance: distance(unit.root.position),
    status: world.unseen > 0 ? 'SEARCHING' : unit.contact > 0 ? 'RAMMING' : 'PURSUIT',
  }));
  if (world.helicopter) units.push({ name: 'AIR ONE', distance: distance(world.helicopter.root.position), status: world.unseen > 0 ? 'SEARCHING' : 'SPOTLIGHT' });
  if (world.roadblock) {
    for (const [i, model] of world.roadblock.userData.models.entries()) {
      // Root and parked-model translations are independent of patrol positions.
      const position = model.root.getWorldPosition(model.root.position.clone());
      units.push({ name: 'BARRIER-' + (i + 1), distance: distance(position), status: 'ROADBLOCK' });
    }
  }
  return units;
}

export function createDenseHud(combat) {
  const select = selector => document.querySelector(selector);
  const nodes = Object.fromEntries(['stage-label', 'stage-bar', 'mission-timer', 'next-objective', 'district', 'car-name', 'condition', 'gear', 'dispatch-list', 'dispatch-level'].map(id => [id, select('#' + id)]));
  const slots = combat.slots.map((slot, i) => {
    const cell = document.createElement('div');
    cell.className = 'weapon-slot';
    const key = document.createElement('kbd');
    key.textContent = i + 1;
    const name = document.createElement('span');
    name.textContent = slot.name;
    const ammo = document.createElement('b');
    cell.append(key, name, ammo);
    select('#weapons').append(cell);
    return { cell, ammo };
  });
  const rows = Array.from({ length: 7 }, () => {
    const row = document.createElement('div');
    row.className = 'dispatch-unit';
    const name = document.createElement('b'), distance = document.createElement('span'), status = document.createElement('em');
    row.append(name, distance, status);
    nodes['dispatch-list'].append(row);
    return { row, name, distance, status };
  });
  const vitals = Object.fromEntries(['health', 'armour', 'respect'].map(name => [name, {
    bar: select('.' + name + ' i'), value: select('#' + name + '-value'),
  }]));
  CREW_ABILITIES.forEach(ability => {
    const row = document.createElement('div');
    row.className = 'crew-ability';
    const action = document.createElement('b'), member = document.createElement('span');
    action.textContent = ability.action;
    member.textContent = ability.name + ' · ' + ability.role.toUpperCase();
    row.title = ability.detail;
    row.append(action, member);
    select('#crew-abilities').append(row);
  });
  const text = (node, value) => { if (node.textContent !== value) node.textContent = value; };
  let budget = .1, clock = 0;
  return {
    call(speaker, line) {
      const panel = select('#comms');
      setContact(panel, speaker, line);
      panel.hidden = false;
    },
    update(dt, running, missions, world, car, player, conditions, profile = {}) {
      if (running) clock += dt;
      budget += dt;
      // Positions and timers refresh at 10 Hz; unchanged DOM text is never rewritten.
      if (budget < .1) return;
      budget %= .1;
      const progress = missions.progress;
      text(nodes['stage-label'], progress.total ? 'STAGE ' + progress.current + '/' + progress.total : 'FREE DRIVE');
      const ratio = progress.total ? progress.current / progress.total : 0;
      nodes['stage-bar'].style.setProperty('--progress', (ratio * 100) + '%');
      nodes['stage-bar'].setAttribute('aria-valuenow', progress.current);
      nodes['stage-bar'].setAttribute('aria-valuemax', progress.total || 1);
      text(nodes['mission-timer'], (missions.remaining === null ? 'ELAPSED ' : 'TIME LEFT ') + timerLabel(missions.active ? missions.remaining ?? missions.elapsed : clock));
      text(nodes['next-objective'], progress.next);
      text(nodes.district, districtNameAt(player.target.x, player.target.z) + ' · ' + (conditions ? conditions.clock + ' · ' + conditions.label : clockLabel(clock)));
      text(nodes['car-name'], player.driving ? 'PERLA GT' : 'DIEGO · ON FOOT');
      const condition = Math.round(car.health * 100);
      text(nodes.condition, condition + '% · ' + (condition <= 65 ? 'DENTED' : condition <= 90 ? 'SCUFFED' : 'CLEAN'));
      text(nodes.gear, 'GEAR ' + (player.driving ? car.gear : '—'));
      for (const [name, value] of Object.entries(vitalLevels(profile, car))) {
        vitals[name].bar.style.setProperty('--vital', value + '%');
        vitals[name].bar.setAttribute('aria-valuenow', value);
        text(vitals[name].value, String(value));
      }
      combat.slots.forEach((slot, i) => {
        const active = combat.active === i + 1;
        slots[i].cell.classList.toggle('active', active);
        slots[i].cell.setAttribute('aria-label', slot.name + (active ? ' selected' : '') + ', ammunition ' + slot.ammo);
        text(slots[i].ammo, Number.isFinite(slot.ammo) ? String(slot.ammo).padStart(3, '0') : '∞');
      });
      const units = dispatchUnits(world, player.target);
      text(nodes['dispatch-level'], units.length + ' UNITS · LEVEL ' + world.wanted);
      rows.forEach(({ row, name, distance, status }, i) => {
        row.hidden = !units[i];
        if (!units[i]) return;
        text(name, units[i].name);
        text(distance, units[i].distance + ' m');
        text(status, units[i].status);
      });
    },
  };
}
