const KEY = 'la-perla-save-v1';
const VERSION = 2;
// Store progression and paint independently of the procedural asset definitions.
export const SLOTS = ['Slot 1', 'Slot 2', 'Slot 3'];
export const newGame = () => ({
  cash: 2450, completed: [], upgrades: { engine: 0, handling: 0 }, color: 0xda4f3e,
});
function read() {
  for (const key of [KEY, KEY + '-backup']) try {
    const data = JSON.parse(localStorage.getItem(key));
    if (data?.version === VERSION && data.slots && typeof data.slots === 'object') return data;
    if (data?.version === 1) return { version: VERSION, auto: { ...newGame(), ...data }, slots: {} };
  } catch { /* Try the last intact bank if the primary cannot be read. */ }
  return { version: VERSION, auto: null, slots: {} };
}
export function loadGame(slot) {
  const data = read();
  const snapshot = slot ? data.slots[slot] : data.auto;
  if (!Array.isArray(snapshot?.completed) || snapshot.completed.length > 8 ||
      !snapshot.completed.every(title => typeof title === 'string') ||
      !Number.isFinite(snapshot.cash) || snapshot.cash < 0 ||
      !Number.isInteger(snapshot.color) || snapshot.color < 0 || snapshot.color > 0xffffff || !snapshot.upgrades ||
      (snapshot.resume != null && (!Number.isInteger(snapshot.resume.job) || snapshot.resume.job < 0 || snapshot.resume.job >= 8)) ||
      !['engine', 'handling'].every(key => Number.isInteger(snapshot.upgrades[key]) && snapshot.upgrades[key] >= 0 && snapshot.upgrades[key] <= 3)) return null;
  return snapshot;
}
export function saveGame(state, slot) {
  const data = read();
  const snapshot = { ...state, savedAt: Date.now() };
  if (slot) data.slots[slot] = snapshot;
  else data.auto = snapshot;
  try {
    // The entire save bank is replaced in one atomic localStorage operation.
    const previous = localStorage.getItem(KEY);
    if (previous) localStorage.setItem(KEY + '-backup', previous);
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}

// Day 5: ambient actors are transient; saved story, cash, paint and upgrades stay compatible.
