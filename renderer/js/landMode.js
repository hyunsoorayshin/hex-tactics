// ============================================
// Land Mode Module
// ============================================

let landMode = false;

function isLandMode() {
  return landMode;
}

function setLandMode(enabled) {
  landMode = enabled;
}

function toggleLandMode() {
  landMode = !landMode;
  return landMode;
}

// Handle land click on a hex
function onLandClick(hexKey, element) {
  const currentTeam = getCurrentTeam();

  if (GameState.land[hexKey] === currentTeam) {
    // Remove land if clicking same team
    removeLand(hexKey, element);
  } else {
    if (isWaterHex(hexKey)) {
      showNotification('Cannot claim water as land', 'error');
      return;
    }
    // Assign land to current team
    assignLand(hexKey, currentTeam, element);
  }
}

// Assign land to a team
function assignLand(hexKey, teamId, element) {
  GameState.land[hexKey] = teamId;
  const team = GameState.teams[teamId];
  if (element) {
    element.style.fill = team.color;
    element.style.stroke = team.border;
  }
  console.log(`Land assigned: ${hexKey} -> Team ${teamId}`);
}

// Remove land ownership
function removeLand(hexKey, element) {
  delete GameState.land[hexKey];
  if (element) {
    element.style.fill = '';
    element.style.stroke = '';
  }
  console.log(`Land removed: ${hexKey}`);
}

// Apply land color to hex element
function applyLandColor(hexKey, teamId) {
  const element = document.querySelector(`[data-hex="${hexKey}"]`);
  if (element && GameState.teams[teamId]) {
    const team = GameState.teams[teamId];
    element.style.fill = team.color;
    element.style.stroke = team.border;
  }
}

// Clear land color from hex
function clearLandColor(hexKey) {
  const element = document.querySelector(`[data-hex="${hexKey}"]`);
  if (element) {
    element.style.fill = '';
    element.style.stroke = '';
  }
}

// Render all land ownership from GameState
function renderLand() {
  // Clear all land colors first
  document.querySelectorAll('.hex').forEach(hex => {
    hex.style.fill = '';
    hex.style.stroke = '';
  });

  // Apply land ownership colors
  for (const [hexKey, teamId] of Object.entries(GameState.land)) {
    applyLandColor(hexKey, teamId);
  }
}
