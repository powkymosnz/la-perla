// Reserve browser defaults except for gameplay keys.
const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'Space', 'ShiftLeft', 'ShiftRight']);

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  window.addEventListener('keydown', event => {
    if (!controls.has(event.code) || event.target instanceof HTMLButtonElement) return;
    event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  });
  window.addEventListener('keyup', event => held.delete(event.code));
  window.addEventListener('blur', () => {
    held.clear();
    pressed.clear();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      held.clear();
      pressed.clear();
    }
  });
  return {
    down: code => held.has(code),
    take: code => pressed.delete(code),
    axis: (positive, negative) => Number(held.has(positive)) - Number(held.has(negative)),
  };
}
