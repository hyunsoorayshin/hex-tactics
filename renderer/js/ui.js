// ============================================
// UI Module (Status Bar, Notifications)
// ============================================

// Update status bar display
function updateStatus() {
  let status = document.getElementById('status-bar');
  if (!status) {
    status = document.createElement('div');
    status.id = 'status-bar';
    document.body.appendChild(status);
  }

  const currentTeam = getCurrentTeam();
  const teamInfo = GameState.teams[currentTeam];
  const landModeActive = isLandMode();
  const playerModeActive = isPlayerMode();
  const castleModeActive = isCastleMode();
  const bridgeModeActive = isBridgeMode();
  const armyModeActive = isArmyMode();
  const townModeActive = isTownMode();
  const wallModeActive = isWallMode();
  const shipModeActive = isShipMode();

  let modeText = 'SELECT';
  if (landModeActive) modeText = 'LAND';
  if (playerModeActive) modeText = 'PLAYER';
  if (castleModeActive) modeText = 'CASTLE';
  if (bridgeModeActive) modeText = 'BRIDGE';
  if (armyModeActive) modeText = 'ARMY';
  if (townModeActive) modeText = 'TOWN';
  if (wallModeActive) modeText = 'WALL';
  if (shipModeActive) modeText = 'SHIP';

  status.innerHTML = `
    <span class="team-indicator" style="background: ${teamInfo.border}"></span>
    <span>Team ${currentTeam === 0 ? 10 : currentTeam}</span>
    <span class="divider">|</span>
    <span class="mode ${(landModeActive || playerModeActive || castleModeActive || bridgeModeActive || armyModeActive || townModeActive || wallModeActive || shipModeActive) ? 'active' : ''}">${modeText}</span>
    <span class="divider">|</span>
    <span class="hint">L: Land | C: Castle | B: Bridge | A: Army | T: Town | W: Wall | S: Ship</span>
  `;
}

// Show notification message
function showNotification(message, type = 'success') {
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    document.body.appendChild(notification);
  }

  notification.textContent = message;
  notification.className = type;
  notification.style.opacity = '1';

  setTimeout(() => {
    notification.style.opacity = '0';
  }, 2000);
}
