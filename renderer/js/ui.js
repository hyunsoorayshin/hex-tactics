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
  const modeText = landModeActive ? 'LAND MODE' : 'SELECT MODE';

  status.innerHTML = `
    <span class="team-indicator" style="background: ${teamInfo.border}"></span>
    <span>Team ${currentTeam === 0 ? 10 : currentTeam}</span>
    <span class="divider">|</span>
    <span class="mode ${landModeActive ? 'active' : ''}">${modeText}</span>
    <span class="divider">|</span>
    <span class="hint">L: Land Mode | Shift+1-0: Select Team | Tab: Team Panel</span>
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
