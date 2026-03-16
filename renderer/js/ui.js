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
  const catapultModeActive = isCatapultMode();
  const townModeActive = isTownMode();
  const wallModeActive = isWallMode();
  const shipModeActive = isShipMode();
  const fleetModeActive = isFleetMode();
  const wagonModeActive = isWagonMode();
  const mineralModeActive = isMineralMode();
  const battleModeActive = isBattleMode();
  const moveModeActive = isMoveMode();

  let modeText = 'SELECT';
  if (landModeActive) modeText = 'LAND';
  if (playerModeActive) modeText = 'PLAYER';
  if (castleModeActive) modeText = 'CASTLE';
  if (bridgeModeActive) modeText = 'BRIDGE';
  if (armyModeActive) modeText = 'ARMY';
  if (catapultModeActive) modeText = 'CATAPULT';
  if (townModeActive) modeText = 'TOWN';
  if (wallModeActive) modeText = 'WALL';
  if (shipModeActive) modeText = 'SHIP';
  if (fleetModeActive) modeText = 'FLEET';
  if (wagonModeActive) modeText = 'WAGON';
  if (mineralModeActive) modeText = 'MINERAL';
  if (battleModeActive) modeText = 'BATTLE';
  if (moveModeActive) modeText = 'MOVE';

  const anyModeActive = landModeActive || playerModeActive || castleModeActive || bridgeModeActive ||
                        armyModeActive || catapultModeActive || townModeActive || wallModeActive || shipModeActive ||
                        fleetModeActive || wagonModeActive || mineralModeActive ||
                        battleModeActive || moveModeActive;

  status.innerHTML = `
    <span class="team-indicator" style="background: ${teamInfo.border}"></span>
    <span>Team ${currentTeam === 0 ? 10 : currentTeam}</span>
    <span class="divider">|</span>
    <span class="mode ${anyModeActive ? 'active' : ''}">${modeText}</span>
    <span class="divider">|</span>
    <span class="hint">L: Land | C: Castle | B: Bridge | A: Army | D: Catapult | T: Town | W: Wall | S: Ship | F: Fleet | G: Wagon | N: Mineral | X: Battle | M: Move</span>
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
