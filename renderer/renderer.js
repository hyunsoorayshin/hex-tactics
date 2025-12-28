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

    // Auto-load last save
    autoLoadGame();

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
    resetView();
  }

  // Space - pan mode
  if (e.code === 'Space') {
    e.preventDefault();
    onSpaceDown();
  }

  // L - toggle land mode
  if (e.key === 'l' || e.key === 'L') {
    toggleLandMode();
    updateStatus();
    console.log('Land mode:', isLandMode() ? 'ON' : 'OFF');
  }

  // Shift + 1-0 - select team
  if (e.shiftKey && e.code.startsWith('Digit')) {
    const digit = parseInt(e.code.replace('Digit', ''));
    if (setCurrentTeam(digit)) {
      updateStatus();
      // Update team panel if open
      if (isTeamPanelOpen()) {
        updateTeamPanel();
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
