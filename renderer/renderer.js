// ============================================
// Main Entry Point
// ============================================

// Initialize the application
function initApp() {
  const mapImg = document.getElementById('map');

  const onMapReady = () => {
    // Initialize modules
    initPanZoom();
    initTeamPanel();
    initSaveLoad();

    // Generate hex grid and set view
    generateHexGrid();
    resetView();

    // Update UI
    updateStatus();
  };

  // Wait for map image to load
  if (mapImg.complete) {
    onMapReady();
  } else {
    mapImg.onload = onMapReady;
  }
}

// ============================================
// Keyboard Controls
// ============================================

window.addEventListener('keydown', (e) => {
  // Allow typing in input/textarea fields (except Escape and Tab)
  const tag = e.target.tagName;
  if ((tag === 'INPUT' || tag === 'TEXTAREA') && e.key !== 'Escape' && e.key !== 'Tab') {
    return;
  }

  // Escape - reset view or close panel
  if (e.key === 'Escape') {
    if (isTeamPanelOpen()) {
      closeTeamPanel();
      return;
    }
    if (isPlayerMode()) {
      togglePlayerMode();
      updateStatus();
      return;
    }
    if (isCastleMode()) {
      toggleCastleMode();
      updateStatus();
      return;
    }
    if (isBridgeMode()) {
      toggleBridgeMode();
      updateStatus();
      return;
    }
    if (isArmyMode()) {
      toggleArmyMode();
      updateStatus();
      return;
    }
    if (isCatapultMode()) {
      toggleCatapultMode();
      updateStatus();
      return;
    }
    if (isTownMode()) {
      toggleTownMode();
      updateStatus();
      return;
    }
    if (isWallMode()) {
      toggleWallMode();
      updateStatus();
      return;
    }
    if (isShipMode()) {
      // If in ship interaction mode, cancel it first
      if (getShipInteractionMode()) {
        clearShipInteraction();
        renderShips();
        showNotification('Cancelled');
        return;
      }
      toggleShipMode();
      updateStatus();
      return;
    }
    if (isFleetMode()) {
      if (getFleetInteractionMode()) {
        clearFleetInteraction();
        renderFleets();
        showNotification('Cancelled');
        return;
      }
      toggleFleetMode();
      updateStatus();
      return;
    }
    if (isWagonMode()) {
      if (getWagonInteractionMode()) {
        clearWagonInteraction();
        renderWagons();
        showNotification('Cancelled');
        return;
      }
      toggleWagonMode();
      updateStatus();
      return;
    }
    if (isMineralMode()) {
      toggleMineralMode();
      updateStatus();
      return;
    }
    if (isBattleMode()) {
      // If in target selection phase, cancel it first
      if (getBattlePhase() === 'select_target') {
        clearBattleSelection();
        showNotification('Cancelled');
        return;
      }
      toggleBattleMode();
      updateStatus();
      return;
    }
    if (isMoveMode()) {
      // If in destination selection phase, cancel it first
      if (getMovePhase() === 'select_destination') {
        clearMoveSelection();
        showNotification('Cancelled');
        return;
      }
      toggleMoveMode();
      updateStatus();
      return;
    }
    resetView();
  }

  // Space - pan mode
  if (e.code === 'Space') {
    e.preventDefault();
    onSpaceDown();
  }

  // L - toggle land mode
  if (e.key === 'l' || e.key === 'L') {
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleLandMode();
    updateStatus();
    console.log('Land mode:', isLandMode() ? 'ON' : 'OFF');
  }

  // P - toggle player mode
  if (e.key === 'p' || e.key === 'P') {
    if (isLandMode()) toggleLandMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    togglePlayerMode();
    updateStatus();
    console.log('Player mode:', isPlayerMode() ? 'ON' : 'OFF');
  }

  // C - toggle castle mode
  if (e.key === 'c' || e.key === 'C') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleCastleMode();
    updateStatus();
    console.log('Castle mode:', isCastleMode() ? 'ON' : 'OFF');
  }

  // B - toggle bridge mode
  if (e.key === 'b' || e.key === 'B') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleBridgeMode();
    updateStatus();
    console.log('Bridge mode:', isBridgeMode() ? 'ON' : 'OFF');
  }

  // A - toggle army mode
  if (e.key === 'a' || e.key === 'A') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleArmyMode();
    updateStatus();
    console.log('Army mode:', isArmyMode() ? 'ON' : 'OFF');
  }

  // D - toggle catapult mode
  if (e.key === 'd' || e.key === 'D') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleCatapultMode();
    updateStatus();
    console.log('Catapult mode:', isCatapultMode() ? 'ON' : 'OFF');
  }

  // T - toggle town mode
  if (e.key === 't' || e.key === 'T') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleTownMode();
    updateStatus();
    console.log('Town mode:', isTownMode() ? 'ON' : 'OFF');
  }

  // W - toggle wall mode
  if (e.key === 'w' || e.key === 'W') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleWallMode();
    updateStatus();
    console.log('Wall mode:', isWallMode() ? 'ON' : 'OFF');
  }

  // S - toggle ship mode
  if (e.key === 's' || e.key === 'S') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleShipMode();
    updateStatus();
    console.log('Ship mode:', isShipMode() ? 'ON' : 'OFF');
  }

  // F - toggle fleet mode
  if (e.key === 'f' || e.key === 'F') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleFleetMode();
    updateStatus();
    console.log('Fleet mode:', isFleetMode() ? 'ON' : 'OFF');
  }

  // G - toggle wagon mode
  if (e.key === 'g' || e.key === 'G') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleWagonMode();
    updateStatus();
    console.log('Wagon mode:', isWagonMode() ? 'ON' : 'OFF');
  }

  // N - toggle mineral mode
  if (e.key === 'n' || e.key === 'N') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    if (isMoveMode()) toggleMoveMode();
    toggleMineralMode();
    updateStatus();
    console.log('Mineral mode:', isMineralMode() ? 'ON' : 'OFF');
  }

  // X - toggle battle mode
  if (e.key === 'x' || e.key === 'X') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isMoveMode()) toggleMoveMode();
    toggleBattleMode();
    updateStatus();
    console.log('Battle mode:', isBattleMode() ? 'ON' : 'OFF');
  }

  // M - toggle move mode
  if (e.key === 'm' || e.key === 'M') {
    if (isLandMode()) toggleLandMode();
    if (isPlayerMode()) togglePlayerMode();
    if (isCastleMode()) toggleCastleMode();
    if (isBridgeMode()) toggleBridgeMode();
    if (isArmyMode()) toggleArmyMode();
    if (isCatapultMode()) toggleCatapultMode();
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
    if (isFleetMode()) toggleFleetMode();
    if (isWagonMode()) toggleWagonMode();
    if (isMineralMode()) toggleMineralMode();
    if (isBattleMode()) toggleBattleMode();
    toggleMoveMode();
    updateStatus();
    console.log('Move mode:', isMoveMode() ? 'ON' : 'OFF');
  }

  // R - refresh player stats
  if (e.key === 'r' || e.key === 'R') {
    refreshAllPlayerStats();
    renderPlayerMarkers();
    renderAllHealthBars();
    if (isTeamPanelOpen()) updateTeamPanel();
    if (isPlayerMode()) updatePlayerPanel();
    showNotification('Player stats refreshed');
  }

  // Shift + 1-0 - select team
  if (e.shiftKey && e.code.startsWith('Digit')) {
    const digit = parseInt(e.code.replace('Digit', ''));
    if (setCurrentTeam(digit)) {
      updateStatus();
      // Update panels if open
      if (isTeamPanelOpen()) {
        updateTeamPanel();
      }
      if (isPlayerMode()) {
        updatePlayerPanel();
      }
      console.log('Selected Team:', digit === 0 ? 10 : digit);
    }
  }

  // Tab - open/close team panel
  if (e.key === 'Tab') {
    e.preventDefault();
    toggleTeamPanel();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    onSpaceUp();
  }
});

// ============================================
// Start Application
// ============================================

document.addEventListener('DOMContentLoaded', initApp);
