# LA PERLA — Game Design (STRATEGY.md draft)
Target: make.fun gta6-01, top 50 ($6) minimum, top 25 ($10) realistic,
top 10 ($38) if genuinely strong and playable. Deadline 24 Nov 22:00 WIB.

## Identity (all original — nothing from Rockstar or any commercial game)
- Title: **LA PERLA** — "A coastal crime story" (tagline on the start screen).
- City: **LA PERLA**, a Cartagena-inspired coastal city with a walled colonial old
  town and balconies, a mural-covered street-art quarter, fruit stalls and domino
  players in plazas, a port fort, and glass towers beside the old town. Fixed golden
  hour (sun low, long shadows, pink-orange sky, neon starting to glow).
- Districts (6): Malecón (beachfront boulevard), Old Town (tight streets),
  Marina & Port (containers, cranes), Casino Row (neon, hotels), The Hills
  (villas, winding roads), Industrial (warehouses, docks).
- Protagonist: **Diego "D" Fuentes**, 28, wheelman for hire. Just out of a
  short stretch; owes money; drives to buy his freedom.
- Contacts: **Rosa Delgado** (garage owner, fixer, gives the jobs),
  **Comisario Vega** (police chief, antagonist), **El Toro** (rival crew
  leader, finale), **Luz** (radio DJ, voice of the city).
- Story arc (8 jobs): 1) First Fare (tutorial drive) → 2) Borrowed Wheels
  (carjacking + escape) → 3) The Package (delivery under time) → 4) Neon
  Derby (street race) → 5) The Marina Job (robbery + getaway) → 6) Air
  Support (helicopter escape) → 7) Roadblock (breach a police line) →
  8) Last Boat Out (finale: reach the pier, lose the manhunt, sail free).

## World (three.js, low-poly procedural — no external assets)
- Grid city ~1.2 km across: blocks, roads with lane markings, sidewalks,
  palm trees, streetlights, beach + ocean on one edge, pier, ferris wheel
  (landmark), neon signs (canvas textures), parked cars, props.
- Day is fixed at golden hour; fog + warm hemisphere light + sun flare.
- All art procedural: canvas-generated textures (building faces, signs,
  road), low-poly meshes, no downloaded images/fonts/sounds.

## Systems (each its own file — judge criterion 5)
- On foot: walk/run, enter/exit cars, punch. Carjacking: pull driver out.
- Driving: arcade handling (accelerate, brake/reverse, handbrake drift,
  steering), chase camera, damage + condition, nitro (later upgrade).
- Traffic: civilian cars following roads, stopping, honking, fleeing.
- Pedestrians: walking, fleeing from gunfire/crashes, ambient dialogue barks.
- Wanted 1–5 stars: police response scales — patrol cars pursue + ram,
  roadblocks from 3 stars, helicopter + spotlight from 4, spike strips at 5.
  Lose them by breaking line of sight (search zone shrinks, "IN SIGHT"
  indicator). Busted/wasted → respawn at hospital/garage, lose cash.
- Combat: fists, pistol, SMG, shotgun (pickups + shops); weapon wheel (keys
  1–4); shooting from car; police return fire.
- Mission design: multiple completion routes (stealth, driving, escape); never one scripted path.
- Missions: 8 story jobs with stages, timers, objectives, checkpoints,
  dialogue boxes with portraits, pass/fail, cash + respect rewards.
- Economy + progression: cash, respect ranks (Street → Shot Caller),
  garage (buy/repair/upgrade cars: engine, armor, nitro, paint), shops
  (weapons, clothes), safehouse save.
- Save: localStorage (progress, cash, garage, mission state) + continue.
- Radio: 3 stations (Sol 101.9 pop, Lagoon FM synthwave, Celeste 98.1
  latin), procedural WebAudio music + DJ lines, station switch (R).
- HEAT: a pursued car remains recognizable after escape; switching cars clears active
  vehicle heat. A future garage repaint also clears heat (garage is Day 3).
- Police tactics: low-speed PIT only, gradual tire deflation from spikes,
  2–3-unit boxing, helicopter spotting and ground-unit direction.
- HUD (contextual): objective changes flash then shrink to one line; police
  panel only while wanted; compass waypoints and small circular minimap. Future HUD: mission panel (job, stage bars, timer,
  objective, next), police response panel (unit names, distances, statuses),
  wanted stars, cash, weapon slots + ammo, circular minimap, radio strip,
  speed + car name + condition, dialogue box, health/armor, location name.
- Menus: start screen (title, Continue/New Game, controls), pause,
  game over / busted, mission pass/fail cards.

## Tech
- three.js (vendored min build under game/vendor/ — never shown as source).
- Plain ES modules, no build step, no network requests. game/index.html +
  game/src/*.js (one file per system, named for its job).
- Controls: WASD drive/walk, Space handbrake, E enter/exit car, F punch/use,
  mouse aim (on foot), 1–4 weapons, M map, R radio, Esc pause.
- Screenshots (4, ≤256 KiB each, long side ≤1280): 1) cover — golden-hour
  chase, full HUD, helicopter, police; 2) on-foot carjacking on the
  Malecón; 3) mission dialogue + roadblock ahead; 4) garage/menu or
  helicopter escape at the pier.
- Caps: game/ ≤993 files, ≤48 MiB; dossier text ≤160 KiB.

## Build order (mandor: Muse — plan/review/play-test/submit; builder: Codex)
- Day 1 (19 Nov): repo + record + starter + three.js vendored + city grid +
  driving + chase camera + first playable drive.
- Day 2 (20 Nov): on-foot + carjacking + traffic + pedestrians + wanted +
  police AI + HUD shell + minimap.
- Day 3 (21 Nov): 8 missions + story/dialogue + combat + garage/economy +
  saves + radio + menus.
- Day 4 (22 Nov): polish (lighting, effects, juice) + 4 screenshots +
  play-test fixes + check + submit v1.
- Day 5 (23–24 Nov): fix from dev games, resubmit, final submit < 22:00 WIB.

## What NOT to do
- No Rockstar names, characters, logos, map, art or music. No real GTA.
- No scope creep past the winning formula: city + drive + wanted + missions
  + HUD + saves. Cut anything that doesn't show in a screenshot.
- No network requests in game/. No copied code from other entries.
- No submitting before `check` passes and the game is play-tested in Chrome.

## Build log
- 2026-11-19 — Codex: Day 2 adds traffic and driver extraction, fleeing pedestrians,
  five wanted levels with coordinated police tactics, helicopter and spikes, vehicle
  HEAT, and the contextual HUD/minimap. Rebranded throughout as LA PERLA.
  Day 3 missions, combat, garage, saves, radio and menus remain deferred.

### Day 3

Start with road-bound police pursuit, vehicle contact separation, and a city minimap.
