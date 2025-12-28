// ============================================
// Save/Load Module
// ============================================

let currentSaveFile = null;

function getCurrentSaveFile() {
  return currentSaveFile;
}

// Auto-load most recent save on startup
async function autoLoadGame() {
  if (window.gameAPI) {
    const result = await window.gameAPI.autoLoad();
    if (result.success && result.data) {
      GameState.fromJSON(result.data);
      renderGameState();
      currentSaveFile = result.filename;
      console.log('Auto-loaded:', result.filename);
    }
  }
}

// Render game state after loading
function renderGameState() {
  // Render land ownership
  renderLand();

  // Render player markers on map
  renderPlayerMarkers();

  // Render castles on map
  renderCastles();

  // Render bridges on map
  renderBridges();

  // Render armies on map
  renderArmies();

  // Render towns on map
  renderTowns();

  // Render walls on map
  renderWalls();

  // Render ships on map
  renderShips();

  // Render health bars for damaged objects
  renderAllHealthBars();
}

// Initialize save/load event listeners
function initSaveLoad() {
  if (!window.gameAPI) {
    console.warn('gameAPI not available - save/load disabled');
    return;
  }

  // Main process requests game state for saving
  window.gameAPI.onRequestGameState(() => {
    window.gameAPI.sendGameState(GameState.toJSON());
  });

  // Save completed
  window.gameAPI.onGameSaved((result) => {
    if (result.success) {
      currentSaveFile = result.filename;
      showNotification(`Saved: ${result.filename}`);
      console.log('Game saved:', result.filename);
    } else {
      showNotification(`Save failed: ${result.error}`, 'error');
    }
  });

  // Load completed
  window.gameAPI.onGameLoad((result) => {
    if (result.success && result.data) {
      GameState.fromJSON(result.data);
      renderGameState();
      currentSaveFile = result.filename;
      showNotification(`Loaded: ${result.filename}`);
      console.log('Game loaded:', result.filename);
    } else if (!result.success) {
      showNotification(`Load failed: ${result.error}`, 'error');
    }
  });
}
