import { missions as jobs, dialogue } from './story.js';

// Waypoint checks use the world's horizontal coordinates.
const distance = (point, [x, z]) => Math.hypot(point.x - x, point.z - z);

export function createMissions(state) {
  let active = null, stage = 'ready', route = 0, remaining = null, thefts = 0, index = 0;
  return {
    get active() { return active; },
    get stage() { return stage; },
    get remaining() { return remaining; },
    get waypoint() { return active && (stage === 'pickup' ? active.pickup[route] : stage === 'steal' ? [521, 94] : active.goal[route]); },
    get graph() { return dialogue[index]; },
    get objective() {
      if (!active) return 'Open the case files with Esc';
      if (stage === 'steal') return 'Stop, step out with E, then take the market car with E';
      if (stage === 'pickup') return 'Collect the dockworker’s cargo';
      if (index === 1) return 'Lose the patrol, then reach the handoff';
      if (index === 5) return 'Lose the helicopter and reach the safe street';
      if (index === 7) return route ? 'Lose the manhunt and board on foot' : 'Drive down the pier to El Toro’s boat';
      return active.routes[route] + (index === 3 ? ' before El Toro' : '');
    },
    start(jobIndex) {
      index = jobIndex;
      active = jobs[index];
      stage = 'intro';
      route = 0;
      remaining = null;
      return active;
    },
    choose(value) { route = value; },
    launch(world) {
      stage = index === 1 ? 'steal' : active.pickup ? 'pickup' : 'playing';
      remaining = active.time?.[route] ?? null;
      thefts = world.thefts;
      if (active.pursuit && !active.pickup) world.raiseWanted(active.pursuit);
    },
    update(dt, player, world, car) {
      if (!active || ['ready', 'intro', 'complete', 'failed'].includes(stage)) return;
      if (car.health <= 0) { stage = 'failed'; return; }
      if (remaining !== null) {
        remaining = Math.max(0, remaining - dt);
        if (!remaining) { stage = 'failed'; return; }
      }
      if (stage === 'steal') {
        if (world.thefts > thefts) stage = 'playing';
        return;
      }
      if (distance(player.target, this.waypoint) > (index === 7 ? 5 : index === 2 ? 10 : 12)) return;
      if (stage === 'pickup') {
        stage = 'playing';
        world.raiseWanted(active.pursuit);
        return;
      }
      if ((index === 1 || index === 5 || (index === 7 && route)) && world.wanted) return;
      if ((index === 0 || (index === 7 && !route)) && !player.driving) return;
      if (index === 7 && route && player.driving) return;
      if (!state.completed.includes(active.title)) {
        state.completed.push(active.title);
        state.cash += active.reward;
      }
      stage = 'complete';
    },
    clear() { active = null; stage = 'ready'; },
  };
}

// Day 5: mission stages and rewards remain independent of the ambient population.
