// Each case chooses a clear spawn and a destination inside its named district.
export const missions = [
  { title: 'First Fare', district: 'Old Town', start: [-300, -50, 0], goal: [[-300, 0], [-300, -100]], time: [30, 42], reward: 500, routes: ['North plaza', 'South gate'], intro: ['Rosa', 'The fare’s waiting by the old wall. Get them across Old Town, Diego.'], outro: ['Rosa', 'Good. I can still put your name on a job.'] },
  { title: 'Borrowed Wheels', district: 'Market', start: [518, 98, Math.PI / 2], goal: [[600, 100], [500, 100]], reward: 750, routes: ['Boulevard escape', 'Market back streets'], intro: ['Rosa', 'See the car by the fruit stall? Pull the driver, then shake Vega’s patrol.'], outro: ['Rosa', 'Keep the keys. Lose the color if you see Vega again.'] },
  { title: 'The Package', district: 'Port Fort', start: [500, 0, Math.PI / 2], goal: [[595, 0], [600, 70]], time: [33, 55], reward: 900, routes: ['Fast port handoff', 'Quiet fort handoff'], intro: ['Rosa', 'Vega would pay to see inside this parcel. The port crew pays us to keep it sealed.'], outro: ['Vega', 'The fort saw your plates, Fuentes.'] },
  { title: 'Neon Derby', district: 'Casino Row', start: [600, -262, Math.PI], goal: [[600, -405], [500, -400]], time: [14, 23], reward: 1200, routes: ['Sprint down the strip', 'Long loop past the hotels'], intro: ['El Toro', 'Beat my time to the lights, Diego. Take whichever road you like.'], outro: ['El Toro', 'The boulevard’s yours tonight. Tomorrow I want it back.'] },
  { title: 'The Marina Job', district: 'Marina', start: [597, 180, 0], pickup: [[600, 200], [619, 200]], goal: [[600, 350], [500, 300]], pursuit: 3, reward: 1500, routes: ['Roadside cargo', 'Beach handoff'], intro: ['Rosa', 'My dockworker put the cargo out. Take it, then get clear before Vega closes the road.'], outro: ['Rosa', 'Cargo’s counted. Your cut’s in the case file.'] },
  { title: 'Air Support', district: 'Glass Towers', start: [400, -28, 0], goal: [[300, 200], [500, 200]], pursuit: 4, reward: 1800, routes: ['Under the west towers', 'East service roads'], intro: ['Luz', 'Vega’s bird is over the towers. Cut through the streets until the light moves on.'], outro: ['Luz', 'The chopper’s searching empty pavement. That one’s for you, Diego.'] },
  { title: 'Roadblock', district: 'Port Fort', start: [600, -30, 0], goal: [[600, 105], [500, 100]], pursuit: 3, reward: 2200, routes: ['Push down the port road', 'Circle the fort'], intro: ['Vega', 'You can see the barricade from there. Turn off the engine, Fuentes.'], outro: ['Vega', 'Pull back to the harbor. He’s through.'] },
  { title: 'Last Boat Out', district: 'Pier', start: [600, 48, Math.PI / 2], goal: [[732, 48], [650, 48]], pursuit: 5, reward: 3000, routes: ['Drive to the end of the pier', 'Lose them and board on foot'], intro: ['El Toro', 'The boat leaves when the wheel comes around. I can buy you one turn.'], outro: ['Rosa', 'Go, Diego. I’ll leave the garage light on.'] },
];

export const dialogue = missions.map(job => ({
  intro: { speaker: job.intro[0], line: job.intro[1], choices: job.routes.map((label, route) => ({ label, to: route ? 'alternate' : 'direct', route })) },
  direct: { speaker: 'Diego', line: 'I know the road. I’ll take it.', next: 'end' },
  alternate: { speaker: 'Diego', line: 'Meet me at the other end.', next: 'end' },
  outro: { speaker: job.outro[0], line: job.outro[1], choices: [{ label: 'Radio back', to: 'reply' }, { label: 'Leave it there', to: 'end' }] },
  reply: { speaker: 'Diego', line: 'I heard you. Diego out.', next: 'end' },
  end: { end: true },
}));

export const barks = {
  Rosa: 'Watch the paint, Diego. Police remember a color.',
  Vega: 'Close the exits. He’s heading for the coast.',
  'El Toro': 'You can borrow a car. You can’t borrow respect.',
  Luz: 'Luz on the dial. Keep the windows down, La Perla.',
};

// Day 5: all eight original case files retain their routes, spawns and dialogue.
