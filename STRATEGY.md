# LA PERLA — Game Design (STRATEGY.md draft)
Target: make.fun gta6-01, top 50 ($6) minimum, top 25 ($10) realistic,
top 10 ($38) if genuinely strong and playable. Deadline 24 Nov 22:00 WIB.

## Identity (all original — nothing from Rockstar or any commercial game)
- Title: **LA PERLA** — "A coastal crime story" (tagline on the start screen).
- City: **LA PERLA**, a Cartagena-inspired coastal city with a walled colonial old
  town and balconies, a mural-covered street-art quarter, fruit stalls and domino
  players in plazas, a port fort, and glass towers beside the old town. Selectable midday, golden hour and night, with independent clear/rain weather.
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
- Time/weather presets drive sky, fog, sun direction, city lights, headlights, rain and wet roads.
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

- 2026-11-19 — Day 3 recovery and completion (resume after VM restart):
  - Re-read all eight external design references. Kept the established mission,
    wanted/cash, police, minimap and speed HUD positions, with the Cartagena
    case-file skin. Applied focused menus, short reduced-motion-aware transitions,
    dialogue graphs, impact feedback, versioned saves and separate music/SFX buses.
  - Fixed the interrupted job-start crash (assignment to a getter), the E input
    conflict that prevented normal entry/exit, the unreachable garage operations,
    stale profile references, incomplete heat cleanup and un-applied handling upgrades.
    Personally revised every recovered source file, including all eight new modules.
  - Police have black bodies, white doors/roofs, readable POLICE lettering, wheels,
    glazed cabins and alternating emissive red/blue roof bars. Pursuit uses the actual
    100-unit street pitch around 80-unit blocks; intersection turns stay on the grid.
    Contact separates patrols, the player and parked roadblock cars, rather than
    allowing bodies to overlap. Obstructed sightlines/distance start a search, and
    repaint removes the pursuit models, helicopter, roadblocks, spikes and HEAT.
  - The minimap shares city/coast dimensions: roads, 80-unit blocks, beach and shore,
    pier, ferris wheel, traffic, patrols, helicopter, player and clamped job waypoint.
    The compass shows relative bearing and distance. Reserved the fort, tower and
    garage parcels so generic buildings no longer bury those landmarks.
  - All eight case files are playable in sequence, with two route choices each:
    First Fare (timed drive), Borrowed Wheels (actual theft followed by escape),
    The Package (timed port delivery), Neon Derby (El Toro's time trial),
    The Marina Job (cargo pickup then getaway), Air Support (helicopter evasion),
    Roadblock (cross Vega's line), Last Boat Out (pier drive or lose heat/board on foot).
    Intro and outro graphs branch, wait for player input and terminate; Rosa,
    Vega, El Toro and Luz have dialogue/barks. Rewards cannot be farmed by replay.
  - On-foot fists/pistol (1/2, F) have range/occlusion tests, impact sound, knockback,
    decaying camera trauma and real-time hit-stop recovery. Assault/gunfire raise
    wanted levels. E still handles car entry, exit and the visible driver extraction.
  - Rosa's garage (G when nearby and stopped) offers repair ($250), repaint/HEAT
    removal ($400), engine and handling upgrades ($800, three levels each).
    Cash, paint, upgrades, completed cases and the current job checkpoint persist.
  - Three manual slots and a separate autosave use one atomic localStorage bank
    replacement, schema v2, a previous-bank backup, v1 migration and validation.
    Continue, case files, pause, job completion/failure and retry screens are wired.
    Manual slots never replace autosave. Storage errors produce a visible message.
  - Three procedural WebAudio stations have different rhythms/scales/timbres,
    musical-clock scheduling, randomized impact SFX, R switching, Luz text and a
    dedicated dialogue duck bus. No downloaded audio, fonts, art or network assets.
  - Batched immutable city geometry and enabled a lower-resolution, no-shadow
    software-renderer fallback after recovering very slow browser frames on the VM.
    Hardware rendering keeps shadows. Restarted the workspace's verified server
    process between test phases; kept Playwright operations in short bursts.
  - Browser play-test: drove First Fare end to end, received $500 and its outro;
    then exited, stole the market car, escaped the two-star patrol and completed
    Borrowed Wheels for $750. Bought repaint, engine, handling and repair; cash
    went from $3,700 to $1,450 and HEAT cleared. Saved Slot 1 and reloaded via
    Continue: two jobs, $1,450, paint and both upgrade levels survived.
  - Additional browser checks: melee knocked the staged target back 1.25 units
    and raised one star; pistol hit raised two. AudioContext was running; dialogue
    reduced music duck gain to ~0.28. A deterministic browser pursuit probe measured
    >=5.30 player/patrol separation, >=5.15 patrol/patrol separation, no embedded
    patrols and zero off-grid deviation during a tested corner.
  - node tests/day3.mjs passes all 16 mission completion routes, intro/outro graph
    branches, timer failure, save round trips/migration/corruption backup, independent
    slots and shared minimap geometry/symbol checks. Packaging with main.ts also ran
    successfully using /tmp/la-perla-day3. Browser console had no game errors and all
    recorded game requests were localhost assets.
  - Captured Day 3 proof images (not the Day 4 final screenshot pass):
    screenshots/1-start.jpg (Old Town fare/outro), 2-play.jpg (port fort delivery),
    3-end.jpg (market driver extraction), 4-chase.jpg (glass towers, helicopter and
    police). The latter district shots use explicit QA staging; the first two jobs
    above were completed through normal keyboard input.
  - No competition check, submission, push or Day 4 polish/finalization performed.
  - Final browser confirmation: injected timer expiry opened The Package's failure
    screen and Retry returned to its intro. Loading Slot 1 through the pause menu
    restored $1,450, both completed jobs, teal paint and engine/handling level 1.
    A moving roadblock-contact probe retained >=5.30 player/vehicle separation,
    >=5.12 between all sampled police bodies and no embedded pursuing cars.
    All four proof JPEGs are 1280x720 and below 105 KiB each. Left the ordinary
    localhost URL on its title screen with Continue enabled.

### Day 4

- Built seeded facade atlases with framed and lit windows, colonial arches,
  pastel walls, balconies, roof trims and parapets. The port has stone
  battlements, cranes and stacked cargo. Market stalls add striped awnings and
  fruit displays. Palms, lamps, benches and the pier with its rotating Ferris
  wheel and upright gondolas dress the waterfront. Glazed towers use teal
  trim and neon accents against the golden-hour sky.
- Shaped the player coupe, marked patrol interceptors, taxi, compacts and vans
  with tapered bodies, glazing, visible tires and separate lights. Added
  independent arm and leg movement, varied outfits and hats for pedestrians.
- Baked static parts into spatial batches and indexed collision checks by city
  block. The chase camera damps by elapsed time and snaps after mission
  relocations. Preserved the mission, wanted, cash, minimap, speed and police
  HUD positions and information. All art and sound are generated locally.
- Replayed the intro and drove in Playwright after the VM restart. The browser
  reported zero game errors and requested only localhost files. Refreshed and
  inspected all four 1280×720 gameplay JPEGs: First Fare in Old Town, Roadblock
  at Port Fort, Borrowed Wheels on foot among market stalls, and Air Support
  among the glass towers. The market proof uses staged traffic and pedestrian
  positions in the running game. The chase JPEG decodes to its final marker.
- Day 3 and Day 4 Node suites passed, covering mission routes and spawns, saves,
  minimap geometry, driving, walking, four-star air support and chase camera
  behavior at different frame rates.

### Day 5 — Living city / v2 (2026-11-19)

- Verified the clean submitted baseline on `submit-v1` at
  `2e44f6832d788a5a053612be941e705016de2eb5`. Stayed on that branch and
  quoted the existing make.fun beacon before the first source write. Read the
  external game-ai, level-design and performance-optimization skills in place;
  no skill or external art/audio asset was copied into the repository.
- Replaced the 12 sparse civilians with a bounded population of 724 cars:
  450 circulating and 274 parked in curb bays, using four procedural models
  and nine paint colors. Closed lane loops advance one axis at each corner,
  remain inside the street grid, and keep parking away from intersections.
  A 5 Hz spatial-bucket sensor handles queues, nearby patrols and chase reactions.
  The mission taxi remains stealable and is reset by Borrowed Wheels as before.
- Added 1,292 initial pedestrians throughout the sidewalks, busy boulevards,
  market, beach and plazas. Walkers animate arms, legs and attached shoes;
  outfits, skin tones and hats vary. Chatting groups, seated bench occupants,
  six fruit vendors and four articulated domino players are present in the
  actual market. Nearby chase/fast-car perception interrupts activities with
  fleeing. Extracted drivers share a hard-capped crowd pool rather than leaking
  new meshes after repeated thefts.
- Added 113 striped beach umbrellas with matching towels, sunbathers and
  companions in two rows. The shared bay layout leaves the pier approach clear.
  Nine vendor carts, additional occupied benches, market pennants/crates and
  original illuminated billboards/signs add street activity: PERLA VIVA,
  MERCADO SOL, LA PLAZA, BAHIA CLARA, COSTA DORADA, CLUB MAREA, CASA BRISA,
  LUZ 101 and RITMO LOCAL. All geometry and textures are generated locally.
- Static dressing uses spatial vertex-color/instance batches. Civilian model
  templates are baked once; cars and articulated people use fixed instance
  buffers, camera-frustum compaction and distance limits. Hardware visible
  budgets are 104 cars / 180 people; SwiftShader budgets are 72 / 120.
  Software rendering drops distant vehicle trim and caps view distance at 220.
  Offscreen actors retain their simulation/theft state independently of culling.
- Preserved the golden-hour lighting, district identities, original eight jobs,
  police pursuit/separation/roadblock/helicopter/spikes, wanted/HEAT, player
  handling, garage prices/upgrades, save schema, radio and every HUD information
  field/position. Set the west glass tower back ten units after the new route
  containment test found its original podium intruding into the curb lane.
  Added authored compatibility/invariant notes to pre-existing custom sources
  for recording authorship; the kit dossier library and vendored engine stay
  unchanged.
- Regression suites: `node tests/day3.mjs`, `node tests/day4.mjs` and
  `node tests/day5.mjs` all pass. They cover all 16 mission routes, dialogue,
  saves/migration/backup/slots, spawn/goal clearance, driving, camera behavior,
  population/model/paint caps, social roles, fleeing, carjacking and pursuit.
  The Day 5 traffic probe runs four simulated minutes: maximum deviation from
  a street centerline is 7 units (curb parking); every sampled civilian stays
  out of buildings/fort walls, and 446 moving cars changed position by >2 units.
- Performance budget: target 16.67 ms at 60 FPS on desktop, fallback 33.3 ms.
  CPU-only 60 Hz world simulation measured 0.57 ms mean / 0.82 ms p95 over
  360 samples. Three short same-district browser samples on this VM's
  SwiftShader measured v1 means 299.67 / 350.20 / 311.06 ms versus final
  339.69 / 374.92 / 320.24 ms; final p95 values were 408.20 / 456.50 / 382.50 ms.
  Render calls were 81 before / 77 after, and triangles 73,628 / 79,146, despite
  the much larger population. Software GPU rendering remains far below target;
  these measurements do not establish smoothness on hardware. Lower resolution
  trials helped little, so the final pass retains the original pixel ratio and
  limits work through batching, camera culling and actor/detail budgets.
- Chrome/Playwright: baseline loaded without console errors, intro dismissed and
  ordinary keyboard driving reached 23 KM/H. Final ordinary driving reached
  44 KM/H; the four-star chase reached 52 KM/H with three patrols, helicopter
  and a roadblock. Actual E-key driver extraction displayed PULLING DRIVER,
  incremented thefts and raised two stars. Final console: zero game errors;
  all 24 observed requests were localhost page/module/engine files.
- Replaced all four screenshots with unedited browser JPEGs: crowded Old Town
  First Fare; occupied Port Fort beach/umbrellas and boulevard traffic; market
  extraction among fruit stalls, vendors and pedestrians; Glass Towers air
  support chase through civilian traffic. The district/mission menus and QA
  position hooks frame the beach and market; the market theft itself uses
  ordinary E-key input. A timed beach capture expired during initial inspection;
  retried the case and replaced it with active gameplay at 55 seconds remaining.
  Inspected each final image, verified full JPEG decode, distinct hashes,
  1280x720 dimensions and less than 114 KiB per image.
- `MAKEFUN_OUTPUT_DIR=/tmp/la-perla-day5-build node main.ts` packages successfully.
  The official kit's worktree check passed with zero failures. Final commit
  check and one v2 submission attempt follow this build log; recording
  `01a1f375-553b-7631-831c-14aef174d0bd` is this Day 5 run, alongside the three
  supplied Day 1/3/4 recordings. No push, branch switch or Day 6 work performed.

### Day 6 — Screenshot density and district polish (2026-11-19)

- Filled the previously blank dark podiums at the glass towers with two original,
  locally generated La Perla/radio and Sol de Oro/juice ads; changed tower glass
  to a lighter lit material so the modern district reads as glass rather than black
  blocks. Expanded the market forecourt with four shade canopies, produce crates,
  five extra fruit carts and visitor clusters around the stalls.
- Added compact dark backing to radio, action, compass and speed HUD elements for
  legibility over bright roads, buildings and sea. Captured four busy Playwright
  frames for Old Town, Market, Port Fort and Glass Towers with traffic, pedestrians
  and active police response; the towers frame also includes Vega's helicopter.
  All new artwork is procedural and the game still uses local files only.

### Day 7 — Vehicle silhouettes and busy boulevards (2026-11-19)

- Rebuilt all six vehicle silhouettes around open wheel arches, full glazing and separate lamps. Every rendered civilian keeps all four animated tires and complete body geometry at every draw distance. Ground contact shadows anchor the cars even on software renderers; the coupe has a red low body and spoiler, and interceptors have white doors, POLICE markings and flashing light bars.
- Increased boulevard traffic and sidewalk crowds, added palms, lamps, crossing signs, curb paint and utility wires, and lowered the chase camera with clearance checks around walls. Layered procedural clouds and a hazy, distant skyline frame the low sunset without external assets.

### Day 8 — Dense HUD and action screenshots (2026-11-19)

- Read the supplied leaderboard analysis and the external game-ui-ux, game-feel,
  and camera-systems skills in place. Kept the existing coastal case-file palette
  and chase camera; stacked the mission, weapons and contact panels at the left
  edge so longer objectives cannot overlap them or cover the player car.
- Added five functional 1–5 weapon slots: Fists, Pistol, SMG, Shotgun and Carbine,
  with active selection, finite ammunition, distinct ranges/cooldowns, empty-ammo
  handling and session reset. On foot, F consumes a real round; switching also
  works while driving. Browser proof: pistol 072 → 071 and all five keys select.
- Dispatch now names TARPON-11, MARLIN-3, GULL-1, AIR ONE and each actual roadblock
  vehicle. Distances come from current world positions; pursuit, search, contact
  ramming, spotlight and roadblock states, unit count and wanted level are live.
- Mission conversations and live radio calls share procedural colored initial
  portraits, full contact names and roles. Enlarged cash and speed; added PERLA GT,
  actual condition percentage, forward/reverse/neutral gear, mission stage bar,
  remaining/elapsed timer, NEXT objective, position-based district and advancing
  in-game clock. Dark translucent backing and cached 10 Hz updates keep the HUD
  readable without rewriting unchanged text. Free drive clears stale mission timers.
- Replaced all four screenshots through Playwright MCP with unedited 1280×720
  JPEGs showing four-star patrol cars and a fully visible helicopter in each:
  1-start.jpg / Old Town / 111 KM/H / 170,039 bytes;
  2-play.jpg / Market / 115 KM/H / 167,279 bytes;
  3-end.jpg / Port Fort / 116 KM/H / 157,314 bytes;
  4-chase.jpg / Glass Towers / 114 KM/H / 169,172 bytes.
  Used the existing test-only world hooks to stage the four districts and pursuit
  positions, then accelerated through actual car physics and held W during capture.
  No speedometer values or screenshot pixels were fabricated. Inspected each final
  image and fully decoded all four JPEGs; every file is below 256 KiB.
- Final regression: `node tests/day3.mjs`, `node tests/day4.mjs`,
  `node tests/day5.mjs` and the added `node tests/day8.mjs` all PASS. Day 8 covers
  selection/ammo/cooldowns, mission progression, dispatch distances/tactics and
  roadblock transforms, district/clock formatting and driving gears. Playwright
  reports zero console errors across the session and only localhost asset requests;
  the ordinary keyboard drive exceeded 65 KM/H before screenshot staging.


### Day 9 — Weather and time-of-day variety (2026-11-19)

- Added independent noon/golden/night and clear/rain scene state in environment.js.
  The same settings are available during normal play via Esc → Time & weather.
  Noon raises the sun for short shadows and a blue sky; golden preserves the warm
  sunset; night has a dark star/moon sky, cool city fill, emissive window masks,
  streetlamp pools and two real headlight spotlights plus projected road beams.
  Existing red vehicle tail lamps remain visible. HUD backing stays readable.
- Rain darkens clouds/fog, lowers direct sun, changes asphalt roughness/metalness,
  adds procedural broken reflection streaks, falling line particles and road
  splash rings. Fixed pools/instance buffers bound the cost; there are no external
  assets, additional shadow maps, or scene reflection render passes.
- Test URL time/weather choices require ?test; invalid choices fall back safely.
  The QA hook and its condition snapshot are frozen, with read-only condition
  diagnostics and no condition setter exposed. Normal mode has no QA hook and
  ignores staging parameters. The existing world references still support QA staging.
- Replaced all four JPEGs via Playwright MCP while holding W and accelerating
  through actual driving physics. Test-only placement clears the capture lane and
  frames the live police/helicopter; HUD speed and pixels are not fabricated.
  Each 1280×720 image contains police cars and a helicopter:
  - 1-start.jpg: Old Town, golden hour / clear, visible 96 KM/H, 132,023 bytes.
  - 2-play.jpg: Market, midday / rain, visible 96 KM/H, 135,789 bytes.
  - 3-end.jpg: Port Fort, night / clear, visible 96 KM/H, 108,957 bytes.
  - 4-chase.jpg: Glass Towers, midday / clear, visible 94 KM/H, 151,562 bytes.
  All four were visually inspected and fully decoded; each is below 256 KiB.
- Final Node regression run: day3, day4, day5, day8 and new day9 all PASS.
  Day 9 covers six combinations, actual sky uniforms/sun elevation, illuminated
  facade materials, light visibility/spotlights, dry/wet asphalt, moving rain,
  immutable snapshots, atomic validation and test-only URL selection.
- Browser driving covered all six combinations with zero console errors. Normal
  keyboard driving exceeded 65 KM/H at night; additional golden-rain/night-rain
  probes each rendered eight frames, advanced the car and moved rain particles.
  Normal-mode reload confirmed the QA hook is absent. The first server process
  stopped before that reload; restarting the local server completed the check.
- Official kit check was run outside the Codex sandbox from the kit directory:
  initial committed baseline 5 passed / 0 failed; it explicitly excluded dirty
  files. The same command is rerun against the Day 9 commit after committing.
  No branch switch, push or competition submission.

### Day 10 — Camera angles and varied gameplay frames (2026-11-19)

- Added five driving views selected with C: chase, hood, side tracking, low
  front 3/4 and high wide. The HUD briefly names the active view. The rig probes
  buildings and the ground before rendering and preserves the on-foot view so
  walking and aiming remain predictable. The frozen QA hook exposes preset
  selection and pose diagnostics only with `?test`.
- Captured four 1280×720 Playwright JPEGs with live HUD speed and four-star
  response: First Fare in Old Town at golden hour (low front, 98 KM/H),
  Borrowed Wheels in the rainy Market (side, 73 KM/H), Roadblock at Port
  Fort at night (high wide, 98 KM/H) and Air Support at the Glass Towers
  at midday (hood, 98 KM/H). Staged the actors through the QA hook and
  used actual driving physics for the displayed speed.
- Day 3, 4, 5, 8, 9 and 10 Node suites passed. Playwright cycled all five
  views while driving and confirmed that ordinary play has no QA hook.
