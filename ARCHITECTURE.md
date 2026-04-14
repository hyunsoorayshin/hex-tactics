# Rayhaven Project Architecture

## Overview

Rayhaven is an Electron-based game for students featuring a hex-grid map with team-based land ownership, object placement, and player management. Students earn gold through academic performance (managed via CSV import script), which determines their level and combat stats.

## Project Structure

```
rayhaven2/
├── main.js                 # Electron main process
├── preload.js              # IPC bridge (contextIsolation)
├── package.json
├── ARCHITECTURE.md
├── .gitignore
├── saves/                  # Save files (git-ignored)
│   ├── CSV/                # Student grade CSVs (per class)
│   └── update_gold.py      # CSV → save file gold updater
├── assets/
│   ├── hex-objects/        # Objects placeable on hexes
│   ├── edge-objects/       # Objects placeable on edges
│   ├── mascots/            # Team mascot images (team1.png - team10.png)
│   └── icons/              # Rank icons (recruit.png, private.png, etc.)
└── renderer/
    ├── index.html          # Main window HTML (minimal structure)
    ├── renderer.js         # Entry point, keyboard controls
    ├── map.png             # Game map backdrop
    ├── css/
    │   └── theme.css       # Fantasy theme (black & gold palette)
    └── js/
        ├── gameState.js    # State management, constants
        ├── landMode.js     # Land ownership mode
        ├── playerMode.js   # Player placement, level system, ranks
        ├── castleMode.js   # Castle placement (19-hex territory)
        ├── bridgeMode.js   # Bridge placement with rotation
        ├── armyMode.js     # Army placement on owned land
        ├── townMode.js     # Town placement on owned land
        ├── wallMode.js     # Wall placement on hex edges
        ├── shipMode.js     # Ship placement (any hex)
        ├── catapultMode.js # Catapult placement (siege unit)
        ├── fleetMode.js    # Fleet placement (10 passengers)
        ├── wagonMode.js    # Wagon placement (5 passengers)
        ├── mineralMode.js  # Mineral placement (battle objectives)
        ├── battleMode.js   # Combat system with health, attack range
        ├── moveMode.js     # Object movement with speed limits
        ├── hexGrid.js      # Hex grid system
        ├── panZoom.js      # Navigation controls
        ├── teamPanel.js    # Team UI panel (creates own HTML)
        ├── saveLoad.js     # Persistence
        └── ui.js           # Status bar, notifications
```

## Module Breakdown

### Main Process

#### `main.js`
Electron main process handling:
- Window creation and management
- Native menu (File > Save/Load)
- IPC handlers for save/load operations
- Native file dialogs (macOS style)

#### `preload.js`
Secure IPC bridge exposing `window.gameAPI`:
- `sendGameState(data)` - Send state to main for saving
- `autoLoad()` - Load most recent save on startup
- `onRequestGameState(callback)` - Main requests state for save
- `onGameSaved(callback)` - Save completion notification
- `onGameLoad(callback)` - Load completion with data

### Renderer Modules

#### `gameState.js`
Core state management and constants:
- `GameState` - Central state object containing:
  - `hexObjects` - Objects on hexes (with health values)
  - `edgeObjects` - Objects on edges (with health values)
  - `land` - Hex ownership by team
  - `attacks` - Attack placements
  - `teams` - Team data (name, color, border, outline, players, objectsLost, reviveCount)
- `OBJECT_HEALTH` - Health constants for all object types
- `OBJECT_COSTS` - Gold costs for all object types
- `ICON_SIZE` - Centralized icon sizes (small/medium/large/xlarge)
- `getHealthBarOffset(type)` - Auto-calculates health bar position from icon size
- `HONOR_GOLD` - Honor/dishonor modifier (50g per point)
- `getEffectiveGold(player)` - Base gold + honor bonuses - dishonor penalties
- `REVIVE_COST` - Cost per player revive (10g)
- Current team selection state
- Helper functions:
  - `getCurrentTeam()`, `setCurrentTeam()`
  - `transferPlayer(fromTeamId, toTeamId, playerId)` - Move player between teams preserving all stats
  - `getTeamGold()` - Sum of all player effective gold (merit points)
  - `getTeamObjectsCost()` - Cost of currently placed objects
  - `getTeamLostObjectsCost()` - Cost of destroyed objects
  - `getTeamReviveCost()` - Total revive costs
  - `getTeamAvailableGold()` - Merit points minus all costs

#### `landMode.js`
Land ownership system:
- Land mode state and toggle functions
- `onLandClick()` - Handles land assignment/removal on hex click
- `assignLand()` / `removeLand()` - Modify land ownership
- `applyLandColor()` / `clearLandColor()` - Visual updates
- `renderLand()` - Renders all land ownership from state
- Exports: `isLandMode()`, `setLandMode()`, `toggleLandMode()`, `renderLand()`

#### `playerMode.js`
Player placement and level system:
- Player mode state and toggle functions
- Side panel for selecting players from current team
- `onPlayerModeHexClick()` - Places selected player on clicked hex
- `renderPlayerMarkers()` - Draws player markers on map (level + name + rank icon)
- `addPlayerMarker()` - Creates SVG marker with rank icon and team color outline
- **Level System:**
  - `getPlayerLevel(gold)` - Triangular XP curve (each level costs more gold)
  - `getGoldForLevel(level)` - Gold threshold: `level × (level-1) × 50`
  - `getPlayerStats(gold)` - Returns `{ health: 20 + level×8, attack: 10 + level×5, level }`
  - `refreshAllPlayerStats()`, `transferPlayer()` - Recalculates all player stats, scales health proportionally
- **Military Rank Tiers** (based on level, determines icon):
  - Recruit (Lv 1-3), Private (Lv 4-6), Sergeant (Lv 7-10), Captain (Lv 11-15)
  - Commander (Lv 16-20), General (Lv 21-28), Marshal (Lv 29-38)
  - Warlord (Lv 39-49), Conqueror (Lv 50-64), Overlord (Lv 65+)
- **Death/Revival System:**
  - Dead players shown with skull icon and "Dead" status in panel
  - Dead players can only be placed at team's own town or castle
  - Revival restores full health based on level and increments revive counter
- Exports: `isPlayerMode()`, `setPlayerMode()`, `togglePlayerMode()`, `renderPlayerMarkers()`, `getPlayerStats()`, `getPlayerLevel()`, `getGoldForLevel()`, `getPlayerRank()`, `refreshAllPlayerStats()`

#### `castleMode.js`
Castle placement system (upgrade from town):
- **Prerequisite**: Must have existing town at center hex
- Requires 19 contiguous hexes of team land (center + 6 inner ring + 12 outer ring)
- `getOuterRing()` - Calculates 12 outer ring hexes around inner ring
- `getCastleHexes()` - Returns all 19 hexes for castle placement
- `canPlaceCastle()` - Validates town exists and 19-hex territory requirement
- `placeCastle()` - Upgrades town to castle, marks all 18 neighbors as castle-territory
- `removeCastle()` - Removes castle center only (territory hexes remain)
- `renderCastles()` - Draws castle markers with team-specific images
- Health: 350 HP
- Uses team-colored castle images (`castle1.png` - `castle10.png`)
- **Housing System:**
  - Shift+click empty castle → housing mode → click player → player housed (healed to full)
  - Shift+click occupied castle → evicting mode → click hex → player moves out
  - Castle stores `housed: { teamId, playerId, name }` when occupied
  - Housed player name label displayed above castle icon
  - Yellow dashed ring indicates selected castle during interaction
- Exports: `isCastleMode()`, `setCastleMode()`, `toggleCastleMode()`, `renderCastles()`, `getCastleHousingMode()`, `clearCastleHousing()`

#### `bridgeMode.js`
Bridge placement system:
- Can be placed on any hex (no land requirement)
- Supports rotation in 60° increments (right-click to rotate)
- `placeBridge()` / `removeBridge()` - Manage bridge state
- `rotateBridge()` - Cycles through 0°, 60°, 120° orientations
- `renderBridges()` - Draws bridge markers with team color outline
- Health: 40 HP
- Exports: `isBridgeMode()`, `setBridgeMode()`, `toggleBridgeMode()`, `renderBridges()`

#### `armyMode.js`
Army placement system:
- Requires placement on team's owned land
- `placeArmy()` / `removeArmy()` - Manage army state
- `renderArmies()` - Draws army markers with team color outline
- Uses SVG filter for team-colored border around icon
- Health: 100 HP
- Exports: `isArmyMode()`, `setArmyMode()`, `toggleArmyMode()`, `renderArmies()`

#### `townMode.js`
Town placement system (territory-based):
- Requires 7 contiguous hexes of team land (center + 6 neighbors)
- `canPlaceTown()` - Validates 7-hex territory requirement
- `placeTown()` - Creates town center and marks 6 neighbors as town-territory
- `removeTown()` - Removes town and all associated territory
- `renderTowns()` - Draws town markers with team color outline
- Uses SVG filter for team-colored border around icon
- Health: 120 HP
- Can be upgraded to castle (see castleMode.js)
- **Housing System:**
  - Shift+click empty town → housing mode → click player → player housed (healed to full)
  - Shift+click occupied town → evicting mode → click hex → player moves out
  - Town stores `housed: { teamId, playerId, name }` when occupied
  - Housed player name label displayed above town icon
  - Yellow dashed ring indicates selected town during interaction
- Exports: `isTownMode()`, `setTownMode()`, `toggleTownMode()`, `renderTowns()`, `getTownHousingMode()`, `clearTownHousing()`

#### `wallMode.js`
Wall placement system (edge objects):
- Placed on hex edges, not hex centers
- Edge key format: `"q,r,side"` (side 0-5)
- `placeWall()` / `removeWall()` - Manage wall state in `edgeObjects`
- `addWallMarker()` - Calculates edge position/rotation from hex corners
- Uses SVG filter for team-colored border
- Health: 50 HP
- Exports: `isWallMode()`, `setWallMode()`, `toggleWallMode()`, `renderWalls()`

#### `shipMode.js`
Ship placement and passenger transport system:
- Can be placed on any hex (no land ownership requirement)
- `placeShip()` / `removeShip()` - Manage ship state
- `renderShips()` - Draws ship markers with team color outline
- Uses SVG filter for team-colored border around icon
- Health: 60 HP (passenger dies if ship destroyed)
- **Boarding/Disembarking System:**
  - Shift+click empty ship → boarding mode → click player hex → player boards
  - Shift+click ship with passenger → disembarking mode → click hex → player lands
  - Ship stores `passenger: { teamId, playerId, name }` when occupied
  - Passenger name label displayed above ship icon
  - Yellow dashed ring indicates selected ship during interaction
  - Escape cancels interaction mode
- **Combat**: Ships with passengers can attack using passenger's attack value
- Exports: `isShipMode()`, `setShipMode()`, `toggleShipMode()`, `renderShips()`, `clearShipInteraction()`, `getShipInteractionMode()`

#### `battleMode.js`
Combat system with health tracking:
- Two-phase attack: select attacker → select target
- `battlePhase` state: 'select_attacker' | 'select_target'
- `getAttackerAtHex()` - Find player or ship with passenger at hex
- `getTargetAtHex()` - Find any attackable object or player at hex
- `executeAttack()` - Apply damage, handle mutual combat for player vs player
- `applyDamage()` - Reduce health, destroy if ≤ 0, track attacker stats
- `destroyObject()` / `destroyPlayer()` - Mark as destroyed, update stats
- **Combat rules:**
  - Player vs Player: Mutual damage (both take each other's attack value)
  - Player vs Object: Only object takes damage (objects don't fight back)
  - Ship with passenger: Attacks using passenger's attack value
  - Friendly fire: Allowed
- **Stat Tracking:**
  - Player kills: Incremented when player kills enemy player or destroys object
  - Player deaths: Incremented when player is killed (not removed, can revive)
  - Team objectsLost: Incremented when team's object is destroyed
- `renderHealthBar()` / `renderAllHealthBars()` - Visual health indicators (below object, auto-offset via `getHealthBarOffset`)
- Red pulse animation on selected attacker
- Exports: `isBattleMode()`, `setBattleMode()`, `toggleBattleMode()`, `clearBattleSelection()`, `getBattlePhase()`, `renderAllHealthBars()`

#### `moveMode.js`
Object movement system:
- Two-phase move: select object → select destination
- `movePhase` state: 'select_object' | 'select_destination'
- `getMovableAtHex()` - Find any movable object at hex
- `selectObjectToMove()` - Mark object for moving
- `executeMove()` - Move object preserving all state (health, passengers, rotation)
- **Team Land Movement:** Connected team land costs 0 movement; non-team hexes cost 1. Uses 0-1 BFS pathfinding via `computeReachable()`.
- **Special handlers:**
  - `moveCastle()` - Moves center and all 18 territory hexes together
  - `moveTown()` - Moves center and all 6 territory hexes together
- Blue pulse animation on selected object
- Exports: `isMoveMode()`, `setMoveMode()`, `toggleMoveMode()`, `clearMoveSelection()`, `getMovePhase()`

#### `hexGrid.js`
Hex grid implementation (Red Blob Games algorithm):
- `Hex` class with axial coordinates (q, r)
- Pointy-top orientation
- `generateHexGrid()` - Creates SVG overlay with hex polygons and edge lines
- `onHexClick()` - Delegates to active mode (land, player, castle, bridge, army, town, ship, battle, move)
- `onEdgeClick()` - Delegates to wall mode when active
- `getHexNeighbors()` / `getHexAndNeighbors()` - Neighbor calculation for towns/castles
- `getOuterRing()` - Outer ring calculation for 19-hex castles

#### `panZoom.js`
Map navigation:
- Scroll wheel zoom (toward cursor)
- Space + drag to pan
- `resetView()` - Fit map to viewport
- Exports: `initPanZoom()`, `resetView()`, `onSpaceDown()`, `onSpaceUp()`

#### `teamPanel.js`
Team management UI:
- Creates panel HTML dynamically via `createTeamPanelHTML()`
- Modal panel opened with Tab key (widened to 550-700px)
- **Team Stats Display:**
  - Merit Points (sum of all player effective gold)
  - Available Gold (merit points - object costs - lost object costs - revive costs)
  - Land count
- **Asset Counts:** Castle, Wall, Town, Army, Ship, Bridge
  - Shows count with lost in parentheses: `2 (1)` = 2 present, 1 lost
- **Player List:**
  - Name (editable), effective gold display (base gold managed by CSV script)
  - Level badge with HP/ATK stats
  - Honor/dishonor buttons (+/-50g per point)
  - H/D badges (Honor, Dishonor counts)
  - K/D/R badges (Kills, Deaths, Revives)
  - Add/remove players (uses addEventListener for CSP compliance)
- Exports: `initTeamPanel()`, `openTeamPanel()`, `closeTeamPanel()`, `toggleTeamPanel()`, `updateTeamPanel()`, `isTeamPanelOpen()`

#### `saveLoad.js`
Persistence layer:
- `autoLoadGame()` - Available but not called on startup (app starts blank)
- `renderGameState()` - Applies loaded state to UI
- `initSaveLoad()` - Sets up IPC event listeners

#### `ui.js`
UI utilities:
- `updateStatus()` - Updates bottom status bar
- `showNotification(message, type)` - Toast notifications

#### `renderer.js`
Application entry point:
- `initApp()` - Initializes all modules in order
- Keyboard shortcuts bypass when focused on input/textarea (except Escape/Tab)
- Keyboard event handlers:
  - `Escape` - Close panel / reset view / cancel selection / exit mode
  - `Space` - Pan mode
  - `L` - Toggle land mode
  - `P` - Toggle player mode
  - `C` - Toggle castle mode
  - `B` - Toggle bridge mode
  - `A` - Toggle army mode
  - `D` - Toggle catapult mode
  - `T` - Toggle town mode
  - `W` - Toggle wall mode
  - `S` - Toggle ship mode
  - `F` - Toggle fleet mode
  - `G` - Toggle wagon mode
  - `N` - Toggle mineral mode
  - `X` - Toggle battle mode
  - `M` - Toggle move mode
  - `R` - Refresh all player stats
  - `Shift+1-0` - Select team
  - `Tab` - Toggle team panel

### Styling

#### `css/theme.css`
Fantasy theme with black & gold palette:
- CSS custom properties (variables) for colors, spacing, typography
- Base styles: reset, body, scrollbar
- Component styles: hex grid, status bar, notifications, team panel
- Player level badge styles (gold themed)
- Honor/dishonor button and badge styles
- Health bar styles with color-coded damage states (green/yellow/red)
- Battle mode animation (red pulse on selected attacker)
- Move mode animation (blue pulse on selected object)
- All styling centralized here (no inline styles in HTML)

### Gold Management

#### `saves/update_gold.py`
External script for importing student grades as gold:
- Reads CSV grade sheets from `saves/CSV/` (one per class, G5/G6)
- G5 subjects: Voc Test, Sci Test, Sci HW, Read, Gram Test, Novel
- G6 subjects: Voc Test, Sci HW, Sci Test, TFL Listening, Novel
- Per date row: averages scored subjects, applies bonuses/penalties
- **Bonuses:**
  - +50 per 100-score on Voc Test, Sci HW, Novel, Gram Test
  - Grand Slam: Voc Test + Sci HW + Novel all 100 = +300 extra
  - Perfect Slam: All major test subjects 100 = +500 extra
- **Penalties:**
  - Voc Test: <80 = -40, <70 = -60, <60 = -80, <50 = -100
  - Novel < 50 = -50
- Matches students to save file by Korean name
- Writes updated gold to save JSON (preserves honor/dishonor)

## Script Load Order

Scripts must load in this order (defined in `index.html`):

1. `gameState.js` - No dependencies
2. `landMode.js` - Depends on: gameState
3. `playerMode.js` - Depends on: gameState
4. `castleMode.js` - Depends on: gameState, hexGrid (getHexAndNeighbors, getOuterRing)
5. `bridgeMode.js` - Depends on: gameState
6. `armyMode.js` - Depends on: gameState
7. `catapultMode.js` - Depends on: gameState
8. `townMode.js` - Depends on: gameState, hexGrid (getHexAndNeighbors)
9. `wallMode.js` - Depends on: gameState, hexGrid (Hex, getHexCorners)
10. `shipMode.js` - Depends on: gameState
11. `fleetMode.js` - Depends on: gameState
12. `wagonMode.js` - Depends on: gameState
13. `mineralMode.js` - Depends on: gameState
14. `battleMode.js` - Depends on: gameState, playerMode (getPlayerStats)
15. `moveMode.js` - Depends on: gameState, hexGrid (hexDistance)
16. `hexGrid.js` - Depends on: gameState, all mode modules
17. `panZoom.js` - Depends on: hexGrid (MAP_WIDTH/HEIGHT)
18. `teamPanel.js` - Depends on: gameState, playerMode
19. `saveLoad.js` - Depends on: gameState, all mode modules, ui, battleMode (renderAllHealthBars)
20. `ui.js` - Depends on: gameState, all mode modules
21. `renderer.js` - Depends on: all modules

## Data Flow

### Save Flow
```
User: Cmd+S
  → main.js: menu click
  → preload: request:gameState event
  → renderer: GameState.toJSON()
  → preload: save:gameState
  → main.js: showSaveDialog → writeFile
  → preload: game:saved event
  → renderer: showNotification
```

### Load Flow
```
User: Cmd+O
  → main.js: showOpenDialog → readFile
  → preload: game:load event
  → renderer: GameState.fromJSON()
  → renderer: renderGameState()
  → renderer: showNotification
```

### Gold Update Flow
```
Teacher updates CSV grades
  → Run: python3 saves/update_gold.py
  → Script reads CSV files from saves/CSV/
  → Computes gold per student (avg + bonuses - penalties)
  → Updates save JSON (preserves honor/dishonor, kills, deaths, etc.)
  → Load updated save in game
  → Press R to refresh player stats
```

## Keyboard Controls

| Key | Action |
|-----|--------|
| Scroll | Zoom in/out (toward cursor) |
| Space + Drag | Pan map |
| Escape | Reset view / Close panel / Exit current mode / Cancel selection |
| L | Toggle land mode |
| P | Toggle player mode |
| C | Toggle castle mode |
| B | Toggle bridge mode |
| A | Toggle army mode |
| D | Toggle catapult mode |
| T | Toggle town mode |
| W | Toggle wall mode |
| S | Toggle ship mode |
| F | Toggle fleet mode |
| G | Toggle wagon mode |
| N | Toggle mineral mode |
| X | Toggle battle mode |
| M | Toggle move mode |
| R | Refresh all player stats |
| Shift + Click (ship/fleet/wagon) | Board passenger |
| Option + Click (ship/fleet/wagon) | Disembark passenger |
| Shift + Click (town/castle) | House/evict player |
| Cmd + Click | Remove object (in placement modes) |
| Shift + 1-9, 0 | Select team 1-10 |
| Tab | Toggle team panel |

## State Schema

```javascript
GameState = {
  hexObjects: {
    "q,r": {
      type: "castle" | "town" | "army" | "ship" | "fleet" | "wagon" | "mineral" | "bridge" | "castle-territory" | "town-territory",
      teamId: number,
      health: number,      // Current health (objects only)
      maxHealth: number,   // Maximum health (objects only)
      centerHex: "q,r",    // For territory hexes, reference to center
      passenger: { teamId, playerId, name },  // For ships with passengers
      passengers: [{ kind, teamId, playerId, name }], // For fleets/wagons
      housed: { teamId, playerId, name },     // For towns/castles with housed players
      rotation: number     // For bridges (0, 60, 120 degrees)
    }
  },
  edgeObjects: {
    "q,r,side": {
      type: "wall",
      teamId: number,
      health: number,
      maxHealth: number
    }
  },
  land: {
    "q,r": teamId  // 0-9 representing teams 1-10
  },
  attacks: {
    id: { from: "q,r", to: "q,r", data: {} }
  },
  teams: {
    teamId: {
      name: string,
      color: string,       // rgba fill color for land
      border: string,      // rgba color for land borders
      outline: string,     // solid hex color for icon outlines
      objectsLost: {       // Count of team's objects destroyed by type
        castle: number,
        town: number,
        army: number,
        ship: number,
        fleet: number,
        wagon: number,
        bridge: number,
        wall: number
      },
      mineralsDestroyed: number, // Minerals destroyed (500g bonus each)
      reviveCount: number, // Total player revives (for cost calculation)
      players: {
        playerId: {
          name: string,
          gold: number,       // Base gold (from CSV import)
          honor: number,      // Honor points (+50g each)
          dishonor: number,   // Dishonor points (-50g each)
          position: "q,r" | null,
          health: number,     // Current health (derived from level)
          maxHealth: number,  // Max health (derived from level)
          isDead: boolean,    // Dead flag for UI
          kills: number,      // Enemy players/objects killed
          deaths: number,     // Times died
          revives: number     // Times revived
        }
      }
    }
  }
}
```

## Level System

Gold acts as XP with a triangular scaling curve. Each level requires more gold than the last.

**Formula:** `Gold for Level L = L × (L-1) × 50`

**Effective Gold:** `base gold + (honor × 50) - (dishonor × 50)`

### Level Thresholds

| Level | Gold Required |
|-------|--------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 300 |
| 5 | 1,000 |
| 10 | 4,500 |
| 15 | 10,500 |
| 20 | 19,000 |
| 30 | 43,500 |
| 50 | 122,500 |

### Combat Stats per Level

- **Health** = 20 + (level × 8)
- **Attack** = 10 + (level × 5)

| Level | HP | ATK |
|-------|----|-----|
| 1 | 28 | 15 |
| 5 | 60 | 35 |
| 10 | 100 | 60 |
| 15 | 140 | 85 |
| 20 | 180 | 110 |
| 30 | 260 | 160 |
| 50 | 420 | 260 |

## Military Rank System

Ranks determine the player's icon and are based on level:

| Rank | Level Range | Icon |
|------|------------|------|
| Recruit | 1-3 | recruit.png |
| Private | 4-6 | private.png |
| Sergeant | 7-10 | sergeant.png |
| Captain | 11-15 | captain.png |
| Commander | 16-20 | commander.png |
| General | 21-28 | general.png |
| Marshal | 29-38 | marshal.png |
| Warlord | 39-49 | warlord.png |
| Conqueror | 50-64 | conqueror.png |
| Overlord | 65+ | overlord.png |

## Economy System

Team gold is calculated as:
```
Available Gold = Merit Points + Mineral Gold - Land Cost - Present Objects Cost - Lost Objects Cost - Revive Costs
```

Where:
- **Merit Points** = Sum of all player effective gold
- **Effective Gold** = Base gold (from CSV) + honor×50 - dishonor×50
- **Mineral Gold** = mineralsDestroyed × 500g
- **Land Cost** = land count × 10g
- **Present Objects Cost** = Sum of costs for all currently placed objects
- **Lost Objects Cost** = Sum of costs for all destroyed objects
- **Revive Costs** = reviveCount × 10g

### Object Stats

| Object | HP | ATK | Cost | Move | Range | Icon Size |
|--------|-----|-----|------|------|-------|-----------|
| Army | 60 | 15 | 50g | 2 | 1 | Small (38px) |
| Catapult | 30 | 50 | 150g | 3 | 3 | Small (38px) |
| Ship | 50 | 30 | 75g | 15 | 2 | Small (38px) |
| Wagon | 80 | 0 | 50g | 7 | 0 | Medium (48px) |
| Fleet | 100 | 50 | 250g | 10 | 2 | Medium (48px) |
| Mineral | 100 | 0 | — | 0 | 0 | Medium (48px) |
| Bridge | 80 | 0 | 25g | 0 | 0 | Medium (48px) |
| Wall | 150 | 0 | 50g | 0 | 0 | — (edge) |
| Town | 300 | 0 | 500g | 0 | 0 | Large (64px) |
| Castle | 500 | 0 | 2,500g | 0 | 0 | XLarge (100px) |
| Land | — | — | 10g/hex | — | — | — |

### Player Movement Speed

Base speed 1 + 1 per every 2 rank tiers (max 5 at Conqueror/Overlord).

### Icon Size Tiers

| Tier | Size | Types |
|------|------|-------|
| Small | 38px | Player, Army, Catapult, Ship |
| Medium | 48px | Bridge, Fleet, Wagon, Mineral |
| Large | 64px | Town |
| XLarge | 100px | Castle |

### Combat Rules

- **One-way damage**: Only the target takes damage (no mutual combat)
- **Attack Range**: Player/Army = 1 hex, Ship/Fleet = 2 hexes
- **Ship/Fleet**: Attack directly with their own ATK value
- **Friendly Fire**: Allowed (can attack own team)
- **Castle Destruction**: Only center hex removed, territory hexes remain
- **Ship Destruction**: Passenger dies with the ship
- **Fleet/Wagon Destruction**: All passengers die/are lost
- **Mineral Destruction**: Attacking team gains 500g (team bonus, not individual)
- **Player Death**: Player marked as dead (not removed), can revive at own town/castle
- **Object Removal**: Cmd+click to remove objects (prevents accidental deletion)
- **Move Range**: Visual hex highlight shows reachable hexes; out-of-range moves blocked. Movement through connected team land is free (0 cost); non-team hexes cost 1 movement.
- **Attack Range**: Visual red hex highlight shows attackable hexes; out-of-range attacks blocked

### Revive Cost

- **10g** per player revive (deducted from team available gold)

## Team Colors

| Team | Color | Outline |
|------|-------|---------|
| 1 | Red | #ff3333 |
| 2 | Blue | #3399ff |
| 3 | Green | #33ff33 |
| 4 | Yellow | #ffee33 |
| 5 | Purple | #ff44ff |
| 6 | Teal | #33ffff |
| 7 | Orange | #ffaa33 |
| 8 | Deep Purple | #9933ff |
| 9 | Hot Pink | #ff66aa |
| 10 | Olive | #aadd33 |

## Building Requirements

### Town (7 hexes)
- Requires 7 contiguous hexes of team land (center + 6 neighbors)
- Creates `town-territory` markers on 6 surrounding hexes
- Can be upgraded to castle

### Castle (19 hexes, upgrades from town)
- **Prerequisite**: Existing town at center hex
- Requires 19 contiguous hexes of team land:
  - 1 center hex (was town)
  - 6 inner ring hexes
  - 12 outer ring hexes
- Town is replaced by castle, territory hexes become `castle-territory`

```
Hex Layout (19 hexes):
        12  13  14
      11  02  03  15
    10  01  CC  04  16
      09  06  05  17
        08  07  18

CC = Castle center (was town)
01-06 = Inner ring
07-18 = Outer ring
```

## Future Considerations

- SVG icons to replace PNG + filter approach
- Undo/redo system
- Multiple map support
