// Capture movement keys while leaving Enter and Tab available for menu navigation.
const controls = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyF', 'KeyR', 'KeyG', 'Digit1', 'Digit2', 'Escape', 'Space', 'ShiftLeft', 'ShiftRight']);

export function createInput() {
  const held = new Set();
  const pressed = new Set();
  window.addEventListener('keydown', event => {
    if (event.code === 'Escape') { event.preventDefault(); if (!event.repeat) pressed.add(event.code); return; }
    if (!controls.has(event.code) || event.target instanceof HTMLButtonElement || event.target.closest?.('#intro, #screens, #dialogue')) return;
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
    clear() { held.clear(); pressed.clear(); },
    down: code => held.has(code),
    take: code => pressed.delete(code),
    axis: (positive, negative) => Number(held.has(positive)) - Number(held.has(negative)),
  };
}

// Day 5: drive, walk and theft input mappings remain shared with the submitted v1.
