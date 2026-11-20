# Day 9 weather implementation plan

Goal: playable procedural noon, golden hour and night, with independent clear/rain weather and four real action captures.

Architecture: environment.js owns validated conditions, lighting, bounded precipitation and projected light pools. render.js supplies the sky/light rig; city.js registers facade, lamp and road materials. main.js offers pause-menu selection and test-only URL selection/read-only condition diagnostics. Existing physics, missions and HUD layout stay intact.

Constraints: submit-v1, no push, offline assets, writes inside this repo only. Screenshots 1280×720, <=256 KiB, actual >=60 KM/H, police and helicopter visible, four districts, at least rain and night.

- [x] Add regression tests for all six condition combinations, invalid choices, lit windows/headlights, moving rain and reset to dry.
- [x] Implement scene state, sky/sun/fog changes, city illumination, wet roads, precipitation and menu/test selection.
- [x] Run day3/4/5/8/9. Drive and inspect all conditions in Playwright MCP, including normal mode without the test hook.
- [x] Retake and inspect the four JPEGs, record conditions, district, visible speed and file size.
- [x] Update STRATEGY.md; commit with the requested message, then run official kit check outside sandbox against that commit.

Review: night readability; no streetlight shadow-map cost; stable particle allocation; arbitrary invalid URL choices; reversible weather changes; test hook absent in normal play.
