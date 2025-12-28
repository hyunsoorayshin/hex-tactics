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
      toggleShipMode();
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
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
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
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
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
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
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
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    if (isShipMode()) toggleShipMode();
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
    toggleArmyMode();
    updateStatus();
    console.log('Army mode:', isArmyMode() ? 'ON' : 'OFF');
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
    if (isTownMode()) toggleTownMode();
    if (isShipMode()) toggleShipMode();
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
    if (isTownMode()) toggleTownMode();
    if (isWallMode()) toggleWallMode();
    toggleShipMode();
    updateStatus();
    console.log('Ship mode:', isShipMode() ? 'ON' : 'OFF');
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
