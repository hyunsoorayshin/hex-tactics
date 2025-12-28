# Rayhaven Project Architecture

## Overview

Rayhaven is an Electron-based game for students featuring a hex-grid map with team-based land ownership, object placement, and player management.

## Project Structure

```
rayhaven2/
├── main.js                 # Electron main process
├── preload.js              # IPC bridge (contextIsolation)
├── package.json
├── ARCHITECTURE.md
├── .gitignore
├── saves/                  # Save files (git-ignored)
├── assets/
│   ├── hex-objects/        # Objects placeable on hexes
│   ├── edge-objects/       # Objects placeable on edges
│   ├── mascots/            # Team mascot images (team1.png - team10.png)
│   └── icons/              # Rank icons (peasant.png, farmer.png, etc.)
└── renderer/
    ├── index.html          # Main window HTML (minimal structure)
    ├── renderer.js         # Entry point, keyboard controls
    ├── map.png             # Game map backdrop
    ├── css/
    │   └── theme.css       # Fantasy theme (black & gold palette)
    └── js/
        ├── gameState.js    # State management
        ├── landMode.js     # Land ownership mode
        ├── playerMode.js   # Player placement mode
        ├── castleMode.js   # Castle placement (7-hex territory)
        ├── bridgeMode.js   # Bridge placement with rotation
        ├── armyMode.js     # Army placement on owned land
        ├── townMode.js     # Town placement on owned land
        ├── wallMode.js     # Wall placement on hex edges
        ├── shipMode.js     # Ship placement (any hex)
        ├── battleMode.js   # Combat system with health
        ├── moveMode.js     # Object movement system
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
Core state management:
- `GameState` - Central state object containing:
  - `hexObjects` - Objects on hexes (with health values)
  - `edgeObjects` - Objects on edges (with health values)
  - `land` - Hex ownership by team
  - `attacks` - Attack placements
  - `teams` - Team data (name, color, border, players, objectsLost, reviveCount)
- `OBJECT_HEALTH` - Health constants for all object types
- `OBJECT_COSTS` - Gold costs for all object types
- `REVIVE_COST` - Cost per player revive (10g)
- Current team selection state
- Helper functions:
  - `getCurrentTeam()`, `setCurrentTeam()`
  - `getTeamGold()` - Sum of all player gold (merit points)
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
Player placement system:
- Player mode state and toggle functions
- Side panel for selecting players from current team
- `onPlayerModeHexClick()` - Places selected player on clicked hex
- `renderPlayerMarkers()` - Draws player markers on map
- `addPlayerMarker()` - Creates SVG marker with rank icon and team color border
- Rank system based on gold (Peasant → Farmer → Merchant → Knight → Grand Knight → Baron → King)
- `RANK_STATS` - Health and attack values for each rank
- `getPlayerStats(gold)` - Returns health/attack based on gold amount
- Rank icons: PNG files in `assets/icons/` with team color outline
- **Death/Revival System:**
  - Dead players shown with skull icon and "Dead" status in panel
  - Dead players can only be placed at team's own town or castle
  - Revival restores full health based on rank and increments revive counter
- Exports: `isPlayerMode()`, `setPlayerMode()`, `togglePlayerMode()`, `renderPlayerMarkers()`, `getPlayerStats()`

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
- Health: 350 HP (requires 4-5 King attacks)
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
- Health: 75 HP
- Exports: `isBridgeMode()`, `setBridgeMode()`, `toggleBridgeMode()`, `renderBridges()`

#### `armyMode.js`
Army placement system:
- Requires placement on team's owned land
- `placeArmy()` / `removeArmy()` - Manage army state
- `renderArmies()` - Draws army markers with team color outline
- Uses SVG filter for team-colored border around PNG icon
- Health: 250 HP
- Exports: `isArmyMode()`, `setArmyMode()`, `toggleArmyMode()`, `renderArmies()`

#### `townMode.js`
Town placement system (territory-based):
- Requires 7 contiguous hexes of team land (center + 6 neighbors)
- `canPlaceTown()` - Validates 7-hex territory requirement
- `placeTown()` - Creates town center and marks 6 neighbors as town-territory
- `removeTown()` - Removes town and all associated territory
- `renderTowns()` - Draws town markers with team color outline
- Uses SVG filter for team-colored border around PNG icon
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
- Health: 100 HP
- Exports: `isWallMode()`, `setWallMode()`, `toggleWallMode()`, `renderWalls()`

#### `shipMode.js`
Ship placement and passenger transport system:
- Can be placed on any hex (no land ownership requirement)
- `placeShip()` / `removeShip()` - Manage ship state
- `renderShips()` - Draws ship markers with team color outline
- Uses SVG filter for team-colored border around PNG icon
- Health: 100 HP (passenger dies if ship destroyed)
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
- `renderHealthBar()` / `renderAllHealthBars()` - Visual health indicators (below object, on top layer)
- Red pulse animation on selected attacker
- Exports: `isBattleMode()`, `setBattleMode()`, `toggleBattleMode()`, `clearBattleSelection()`, `getBattlePhase()`, `renderAllHealthBars()`

#### `moveMode.js`
Object movement system:
- Two-phase move: select object → select destination
- `movePhase` state: 'select_object' | 'select_destination'
- `getMovableAtHex()` - Find any movable object at hex
- `selectObjectToMove()` - Mark object for moving
- `executeMove()` - Move object preserving all state (health, passengers, rotation)
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
- Modal panel opened with Tab key
- **Team Stats Display:**
  - Merit Points (sum of player gold - never touched)
  - Available Gold (merit points - object costs - lost object costs - revive costs)
  - Land count
- **Asset Counts:** Castle, Wall, Town, Army, Ship, Bridge
  - Shows count with lost in parentheses: `2 (1)` = 2 present, 1 lost
- **Player List:**
  - Name (editable), gold (editable)
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
- Keyboard event handlers:
  - `Escape` - Close panel / reset view / cancel selection / exit mode
  - `Space` - Pan mode
  - `L` - Toggle land mode
  - `P` - Toggle player mode
  - `C` - Toggle castle mode
  - `B` - Toggle bridge mode
  - `A` - Toggle army mode
  - `T` - Toggle town mode
  - `W` - Toggle wall mode
  - `S` - Toggle ship mode
  - `X` - Toggle battle mode
  - `M` - Toggle move mode
  - `Shift+1-0` - Select team
  - `Tab` - Toggle team panel

### Styling

#### `css/theme.css`
Fantasy theme with black & gold palette:
- CSS custom properties (variables) for colors, spacing, typography
- Base styles: reset, body, scrollbar
- Component styles: hex grid, status bar, notifications, team panel
- Health bar styles with color-coded damage states (green/yellow/red)
- Battle mode animation (red pulse on selected attacker)
- Move mode animation (blue pulse on selected object)
- All styling centralized here (no inline styles in HTML)

## Script Load Order

Scripts must load in this order (defined in `index.html`):

1. `gameState.js` - No dependencies
2. `landMode.js` - Depends on: gameState
3. `playerMode.js` - Depends on: gameState
4. `castleMode.js` - Depends on: gameState, hexGrid (getHexAndNeighbors, getOuterRing)
5. `bridgeMode.js` - Depends on: gameState
6. `armyMode.js` - Depends on: gameState
7. `townMode.js` - Depends on: gameState, hexGrid (getHexAndNeighbors)
8. `wallMode.js` - Depends on: gameState, hexGrid (Hex, getHexCorners)
9. `shipMode.js` - Depends on: gameState
10. `battleMode.js` - Depends on: gameState, playerMode (getPlayerStats)
11. `moveMode.js` - Depends on: gameState
12. `hexGrid.js` - Depends on: gameState, all mode modules
13. `panZoom.js` - Depends on: hexGrid (MAP_WIDTH/HEIGHT)
14. `teamPanel.js` - Depends on: gameState
15. `saveLoad.js` - Depends on: gameState, all mode modules, ui, battleMode (renderAllHealthBars)
16. `ui.js` - Depends on: gameState, all mode modules
17. `renderer.js` - Depends on: all modules

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
| T | Toggle town mode |
| W | Toggle wall mode |
| S | Toggle ship mode |
| X | Toggle battle mode |
| M | Toggle move mode |
| Shift + Click (ship) | Board/disembark player |
| Shift + Click (town/castle) | House/evict player |
| Cmd + Click | Remove object (in placement modes) |
| Shift + 1-9, 0 | Select team 1-10 |
| Tab | Toggle team panel |

## State Schema

```javascript
GameState = {
  hexObjects: {
    "q,r": {
      type: "castle" | "town" | "army" | "ship" | "bridge" | "castle-territory" | "town-territory",
      teamId: number,
      health: number,      // Current health (objects only)
      maxHealth: number,   // Maximum health (objects only)
      centerHex: "q,r",    // For territory hexes, reference to center
      passenger: { teamId, playerId, name },  // For ships with passengers
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
      border: string,      // hex color for borders/outlines
      objectsLost: {       // Count of team's objects destroyed by type
        castle: number,
        town: number,
        army: number,
        ship: number,
        bridge: number,
        wall: number
      },
      reviveCount: number, // Total player revives (for cost calculation)
      players: {
        playerId: {
          name: string,
          gold: number,
          position: "q,r" | null,
          health: number,     // Current health (derived from rank)
          maxHealth: number,  // Max health (derived from rank)
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

## Economy System

Team gold is calculated as:
```
Available Gold = Merit Points - Present Objects Cost - Lost Objects Cost - Revive Costs
```

Where:
- **Merit Points** = Sum of all player gold (never modified by the game)
- **Present Objects Cost** = Sum of costs for all currently placed objects
- **Lost Objects Cost** = Sum of costs for all destroyed objects
- **Revive Costs** = reviveCount × 10g

## Rank System

Player ranks are determined by their gold amount:

| Gold Range | Rank | Icon |
|------------|------|------|
| 0-99 | Peasant | peasant.png |
| 100-999 | Farmer | farmer.png |
| 1000-1999 | Merchant | merchant.png |
| 2000-4999 | Knight | knight.png |
| 5000-7999 | Grand Knight | grandknight.png |
| 8000-9999 | Baron | baron.png |
| 10000+ | King | king.png |

## Combat Stats

### Player Stats by Rank

| Rank | Gold Range | Health | Attack |
|------|------------|--------|--------|
| Peasant | 0-99 | 20 | 10 |
| Farmer | 100-999 | 30 | 15 |
| Merchant | 1000-1999 | 40 | 20 |
| Knight | 2000-4999 | 60 | 30 |
| Grand Knight | 5000-7999 | 80 | 45 |
| Baron | 8000-9999 | 100 | 60 |
| King | 10000+ | 150 | 80 |

### Object Health & Cost

| Object | Health | Cost |
|--------|--------|------|
| Bridge | 40 | 50g |
| Wall | 50 | 25g |
| Ship | 60 | 75g |
| Army | 100 | 100g |
| Town | 120 | 1,000g |
| Castle | 350 | 5,000g |

### Revive Cost

- **10g** per player revive (deducted from team available gold)

### Combat Rules

- **Player vs Player**: Mutual damage - both players take each other's attack value
- **Player vs Object**: Only object takes damage (objects don't fight back)
- **Ship with Passenger**: Can attack using passenger's attack stats
- **Friendly Fire**: Allowed (can attack own team)
- **Castle Destruction**: Only center hex removed, territory hexes remain
- **Ship Destruction**: Passenger dies with the ship
- **Player Death**: Player marked as dead (not removed), can revive at own town/castle
- **Object Removal**: Cmd+click to remove objects (prevents accidental deletion)

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

- Undo/redo system
- Multiple map support
- Additional object types
