# Hex Tactics

A desktop medieval hex-grid tactics game built with Electron and vanilla
JavaScript. Up to ten houses (teams) compete for land on a large hex map:
they claim territory, raise towns and castles, field armies, ships, fleets,
catapults and wagons, build walls and bridges, and fight turn-based battles
over strategic objectives. In-game the world is called Rayhaven.

Core systems:

- **Team economy.** Each house has a gold pool built from its players' gold
  plus destroyed minerals, minus land, building and revive costs. Every
  object has a cost, hit points and, where relevant, attack, range and
  movement values.
- **Player levels and ranks.** A player's effective gold sets their level,
  which sets their HP and attack. Levels map onto a ladder of military ranks
  with their own icons.
- **Honor and dishonor.** Per-player modifiers of +50 / -50 gold per point,
  applied on top of base gold.
- **Battle, movement and siege.** One-way damage, attack range, naval
  combat, army subtypes, terrain, defense values and a death / revival cycle
  with kill, death and revive tracking.
- **Building mode.** Town-to-castle upgrades with territory radius, housing
  limits, walls on hex edges, bridges with rotation.
- **Persistence.** Everything lives in a single JSON save file that you
  create from the app's File menu; nothing is bundled.

The detailed module breakdown, state schema, level tables and economy
formulas are in [`ARCHITECTURE.md`](ARCHITECTURE.md). The in-world rules
introduction is [`GAME_GUIDE.md`](GAME_GUIDE.md) and the Season 2 balance
changes are in [`PATCH_NOTES_S2.md`](PATCH_NOTES_S2.md).

## Why I built it

I wanted a long-running strategy game that a large group could play together
over a whole term: a persistent map that changed week to week, with real
stakes for land and units, and a reason for everyone to care about their
house's standing. It started as something I ran for the groups I was
teaching, where a player's base gold was set from outside the game, and it
grew from a map viewer into the tactics engine here across three seasons.
It is an independent personal project, built on my own time.

## What this is not

- **Not affiliated** with any school, academy or employer.
- **No real player or game data is included.** The engine reads its state
  from a local save file that you create yourself. The `saves/` directory
  is git-ignored and was never committed.
- **No score-import script is included.** In the original run, each
  player's base `gold` value was written into the save file by an external
  script. That script is not part of this repository; you set base gold
  however you like (in-app, or by editing the save JSON).
- The two in-world documents (`GAME_GUIDE.md`, `PATCH_NOTES_S2.md`) were
  written for the players of that original run and still describe base gold
  as coming from "grades" set by "the teacher". Read them as flavour and
  history; the engine itself has no such dependency.

## Running it

Requires Node.js and npm.

```bash
npm install
npm start
```

On first launch there is no game state. Use **File → Save** to create a save
file, then **File → Load** to reopen it later. Keyboard controls (mode
switching, refresh, and so on) are listed in `ARCHITECTURE.md` under
*Keyboard Controls*.

## Repository layout

```
hex-tactics/
├── main.js            Electron main process (window, save/load dialogs)
├── preload.js         IPC bridge
├── renderer/          UI: index.html, theme.css, map image, and js/ modules
│   └── js/            gameState, hexGrid, one module per placement/battle mode
├── assets/            Hex objects, edge objects, team mascots, rank icons
├── ARCHITECTURE.md    Module breakdown, data flow, state schema, formulas
├── GAME_GUIDE.md      In-world introduction to the rules
└── PATCH_NOTES_S2.md  Season 2 balance notes
```

## Author

Hyunsoo Ray Shin (Ray)

## License

MIT. See [LICENSE](LICENSE). The license covers the code and the
documentation in this repository.
