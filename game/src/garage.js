// Repainting updates the shell material shared by the car's body panels.
export const SERVICES = [
  ['repair', 'Repair', 250], ['repaint', 'Repaint and clear HEAT', 400],
  ['engine', 'Upgrade engine', 800], ['handling', 'Upgrade handling', 800],
];

export function createGarage(state, car, world) {
  const colors = [0xda4f3e, 0x37a4a3, 0xe6aa53, 0x8872b5];
  return {
    buy(kind) {
      const service = SERVICES.find(([id]) => id === kind);
      if (!service || state.cash < service[2] || state.upgrades[kind] >= 3) return false;
      state.cash -= service[2];
      if (kind === 'repair') car.repair();
      else if (kind === 'repaint') {
        state.color = colors[(colors.indexOf(state.color) + 1) % colors.length];
        car.setColor(state.color);
        world.clearHeat();
      } else {
        state.upgrades[kind]++;
        car.upgrade(kind);
      }
      return true;
    },
  };
}

// Day 5: ambient density does not alter garage pricing, upgrades or HEAT removal.
