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
│   └── edge-objects/       # Objects placeable on edges
└── renderer/
    ├── index.html          # Main window HTML/CSS
    ├── renderer.js         # Entry point, keyboard controls
    ├── map.png             # Game map backdrop
    └── js/
        ├── gameState.js    # State management
        ├── hexGrid.js      # Hex grid system
        ├── panZoom.js      # Navigation controls
        ├── teamPanel.js    # Team UI panel
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
- `TEAMS` - Team configuration (colors, names) for teams 1-10
- `GameState` - Central state object containing:
  - `hexObjects` - Objects on hexes
  - `edgeObjects` - Objects on edges
  - `land` - Hex ownership by team
  - `attacks` - Attack placements
  - `teams` - Team data with players
- Mode state: `currentTeam`, `landMode`
- Helper functions: `getCurrentTeam()`, `setCurrentTeam()`, `isLandMode()`, `toggleLandMode()`

#### `hexGrid.js`
Hex grid implementation (Red Blob Games algorithm):
- `Hex` class with axial coordinates (q, r)
- Pointy-top orientation
- `generateHexGrid()` - Creates SVG overlay with hex polygons and edge lines
- `onHexClick()` - Handles hex selection/land assignment
- `onEdgeClick()` - Handles edge selection
- `applyLandColor()` / `clearLandColor()` - Visual updates
- `renderLand()` - Renders all land ownership from state

#### `panZoom.js`
Map navigation:
- Scroll wheel zoom (toward cursor)
- Space + drag to pan
- `resetView()` - Fit map to viewport
- Exports: `initPanZoom()`, `resetView()`, `onSpaceDown()`, `onSpaceUp()`

#### `teamPanel.js`
Team management UI:
- Modal panel opened with Tab key
- Displays: team name, total gold, land count, assets
- Player list with add/edit/remove
- Team gold = sum of player gold
- Exports: `initTeamPanel()`, `openTeamPanel()`, `closeTeamPanel()`, `toggleTeamPanel()`, `updateTeamPanel()`, `isTeamPanelOpen()`

#### `saveLoad.js`
Persistence layer:
- `autoLoadGame()` - Loads most recent save on startup
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

## Script Load Order

Scripts must load in this order (defined in `index.html`):

1. `gameState.js` - No dependencies
2. `hexGrid.js` - Depends on: gameState
3. `panZoom.js` - Depends on: hexGrid (MAP_WIDTH/HEIGHT)
4. `teamPanel.js` - Depends on: gameState
5. `saveLoad.js` - Depends on: gameState, hexGrid, ui
6. `ui.js` - Depends on: gameState
7. `renderer.js` - Depends on: all modules

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
| Escape | Reset view / Close panel |
| L | Toggle land mode |
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
      players: {
        playerId: { name: string, gold: number }
      }
    }
  }
}
```

## Future Considerations

- Object placement system using assets folders
- Attack visualization
- Undo/redo system
- Multiple map support
