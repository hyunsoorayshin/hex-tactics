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
  - `hexObjects` - Objects on hexes
  - `edgeObjects` - Objects on edges
  - `land` - Hex ownership by team
  - `attacks` - Attack placements
  - `teams` - Team data (name, color, border, players)
- Current team selection state
- Helper functions: `getCurrentTeam()`, `setCurrentTeam()`

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
- Rank icons: PNG files in `assets/icons/` with team color outline
- Exports: `isPlayerMode()`, `setPlayerMode()`, `togglePlayerMode()`, `renderPlayerMarkers()`

#### `castleMode.js`
Castle placement system:
- Requires 7 contiguous hexes of team land (center + 6 neighbors)
- `canPlaceCastle()` - Validates placement requirements
- `placeCastle()` - Creates castle center and marks 6 neighbors as castle-territory
- `removeCastle()` - Removes castle and all associated territory
- `renderCastles()` - Draws castle markers with team-specific images
- Uses team-colored castle images (`castle1.png` - `castle10.png`)
- Exports: `isCastleMode()`, `setCastleMode()`, `toggleCastleMode()`, `renderCastles()`

#### `bridgeMode.js`
Bridge placement system:
- Can be placed on any hex (no land requirement)
- Supports rotation in 60° increments (right-click to rotate)
- `placeBridge()` / `removeBridge()` - Manage bridge state
- `rotateBridge()` - Cycles through 0°, 60°, 120° orientations
- `renderBridges()` - Draws bridge markers with team color outline
- Exports: `isBridgeMode()`, `setBridgeMode()`, `toggleBridgeMode()`, `renderBridges()`

#### `armyMode.js`
Army placement system:
- Requires placement on team's owned land
- `placeArmy()` / `removeArmy()` - Manage army state
- `renderArmies()` - Draws army markers with team color outline
- Uses SVG filter for team-colored border around PNG icon
- Exports: `isArmyMode()`, `setArmyMode()`, `toggleArmyMode()`, `renderArmies()`

#### `townMode.js`
Town placement system:
- Requires placement on team's owned land
- `placeTown()` / `removeTown()` - Manage town state
- `renderTowns()` - Draws town markers with team color outline
- Uses SVG filter for team-colored border around PNG icon
- Exports: `isTownMode()`, `setTownMode()`, `toggleTownMode()`, `renderTowns()`

#### `wallMode.js`
Wall placement system (edge objects):
- Placed on hex edges, not hex centers
- Edge key format: `"q,r,side"` (side 0-5)
- `placeWall()` / `removeWall()` - Manage wall state in `edgeObjects`
- `addWallMarker()` - Calculates edge position/rotation from hex corners
- Uses SVG filter for team-colored border
- Exports: `isWallMode()`, `setWallMode()`, `toggleWallMode()`, `renderWalls()`

#### `shipMode.js`
Ship placement system:
- Can be placed on any hex (no land ownership requirement)
- `placeShip()` / `removeShip()` - Manage ship state
- `renderShips()` - Draws ship markers with team color outline
- Uses SVG filter for team-colored border around PNG icon
- Exports: `isShipMode()`, `setShipMode()`, `toggleShipMode()`, `renderShips()`

#### `hexGrid.js`
Hex grid implementation (Red Blob Games algorithm):
- `Hex` class with axial coordinates (q, r)
- Pointy-top orientation
- `generateHexGrid()` - Creates SVG overlay with hex polygons and edge lines
- `onHexClick()` - Delegates to active mode (land, player, castle, bridge, army, town, ship)
- `onEdgeClick()` - Delegates to wall mode when active
- `getHexNeighbors()` / `getHexAndNeighbors()` - Neighbor calculation for castles

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
- Displays: team name, total gold, land count, assets
- Player list with add/edit/remove (uses addEventListener for CSP compliance)
- Team gold = sum of player gold
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
  - `Escape` - Close panel / reset view
  - `Space` - Pan mode
  - `L` - Toggle land mode
  - `Shift+1-0` - Select team
  - `Tab` - Toggle team panel

### Styling

#### `css/theme.css`
Fantasy theme with black & gold palette:
- CSS custom properties (variables) for colors, spacing, typography
- Base styles: reset, body, scrollbar
- Component styles: hex grid, status bar, notifications, team panel
- All styling centralized here (no inline styles in HTML)

## Script Load Order

Scripts must load in this order (defined in `index.html`):

1. `gameState.js` - No dependencies
2. `landMode.js` - Depends on: gameState
3. `playerMode.js` - Depends on: gameState
4. `castleMode.js` - Depends on: gameState, hexGrid (getHexAndNeighbors)
5. `bridgeMode.js` - Depends on: gameState
6. `armyMode.js` - Depends on: gameState
7. `townMode.js` - Depends on: gameState
8. `wallMode.js` - Depends on: gameState, hexGrid (Hex, getHexCorners)
9. `shipMode.js` - Depends on: gameState
10. `hexGrid.js` - Depends on: gameState, all mode modules
11. `panZoom.js` - Depends on: hexGrid (MAP_WIDTH/HEIGHT)
12. `teamPanel.js` - Depends on: gameState
13. `saveLoad.js` - Depends on: gameState, all mode modules, ui
14. `ui.js` - Depends on: gameState, all mode modules
15. `renderer.js` - Depends on: all modules

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
| Escape | Reset view / Close panel / Exit current mode |
| L | Toggle land mode |
| P | Toggle player mode |
| C | Toggle castle mode |
| B | Toggle bridge mode |
| A | Toggle army mode |
| T | Toggle town mode |
| W | Toggle wall mode |
| S | Toggle ship mode |
| Shift + 1-9, 0 | Select team 1-10 |
| Tab | Toggle team panel |

## State Schema

```javascript
GameState = {
  hexObjects: {
    "q,r": { type: "category/name", teamId: number, data: {} }
  },
  edgeObjects: {
    "q,r,side": { type: "category/name", teamId: number, data: {} }
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
      color: string,   // rgba fill color for land
      border: string,  // hex color for borders/outlines
      players: {
        playerId: { name: string, gold: number, position: "q,r" | null }
      }
    }
  }
}
```

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

## Future Considerations

- Attack visualization system
- Undo/redo system
- Multiple map support
- Additional object types
