// ============================================
// Player Mode Module
// ============================================

let playerMode = false;
let selectedPlayerId = null;

// Rank definitions based on gold (icons in assets/icons/)
const RANKS = [
  { min: 0, max: 99, name: 'Peasant', icon: 'peasant.png' },
  { min: 100, max: 999, name: 'Farmer', icon: 'farmer.png' },
  { min: 1000, max: 1999, name: 'Merchant', icon: 'merchant.png' },
  { min: 2000, max: 4999, name: 'Knight', icon: 'knight.png' },
  { min: 5000, max: 7999, name: 'Grand Knight', icon: 'grandknight.png' },
  { min: 8000, max: 9999, name: 'Baron', icon: 'baron.png' },
  { min: 10000, max: Infinity, name: 'King', icon: 'king.png' }
];

// Level system: gold acts as XP with increasing cost per level
// Total gold for level L = L × (L-1) × 50  (triangular scaling)
// Level 1: 0g, Level 2: 100g, Level 3: 300g, Level 5: 1000g, Level 10: 4500g, Level 15: 10500g
function getPlayerLevel(gold) {
  // Solve: gold >= level * (level - 1) * 50
  // level^2 - level - gold/50 <= 0
  // level = floor((1 + sqrt(1 + 4 * gold/50)) / 2)
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + 4 * gold / 50)) / 2));
}

// Gold required to reach a given level
function getGoldForLevel(level) {
  return level * (level - 1) * 50;
}

function getPlayerRank(gold) {
  for (const rank of RANKS) {
    if (gold >= rank.min && gold <= rank.max) {
      return rank;
    }
  }
  return RANKS[0];
}

// Get player combat stats based on gold (level-scaled)
// Health = 10 + (level × 3), Attack = 5 + (level × 2)
function getPlayerStats(gold) {
  const level = getPlayerLevel(gold);
  return {
    health: 10 + (level * 3),
    attack: 5 + (level * 2),
    level: level
  };
}

// Refresh all players' stats to match current level
// Scales current health proportionally (e.g. 50% HP stays 50% with new max)
function refreshAllPlayerStats() {
  for (const [teamId, team] of Object.entries(GameState.teams)) {
    for (const [playerId, player] of Object.entries(team.players || {})) {
      if (player.isDead) continue;

      const stats = getPlayerStats(player.gold || 0);
      const oldMax = player.maxHealth || stats.health;
      const newMax = stats.health;

      if (oldMax !== newMax) {
        const healthPercent = (player.health !== undefined) ? player.health / oldMax : 1;
        player.maxHealth = newMax;
        player.health = Math.max(1, Math.round(newMax * healthPercent));
      }
    }
  }
}

function isPlayerMode() {
  return playerMode;
}

function setPlayerMode(enabled) {
  playerMode = enabled;
  if (enabled) {
    openPlayerPanel();
  } else {
    closePlayerPanel();
    selectedPlayerId = null;
  }
}

function togglePlayerMode() {
  setPlayerMode(!playerMode);
  return playerMode;
}

function getSelectedPlayer() {
  return selectedPlayerId;
}

function selectPlayer(playerId) {
  selectedPlayerId = playerId;
  updatePlayerPanel();
}

// ============================================
// Player Panel UI
// ============================================

function createPlayerPanelHTML() {
  // Check if panel already exists
  if (document.getElementById('player-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'player-panel';
  panel.innerHTML = `
    <div class="player-panel-header">
      <span class="player-panel-title">Place Players</span>
      <button id="player-panel-close">&times;</button>
    </div>
    <div class="player-panel-list" id="player-panel-list"></div>
    <div class="player-panel-hint">Select a player, then click a hex to place them</div>
  `;
  document.body.appendChild(panel);

  // Event listeners
  document.getElementById('player-panel-close').addEventListener('click', () => {
    togglePlayerMode();
    updateStatus();
  });
}

function openPlayerPanel() {
  createPlayerPanelHTML();
  const panel = document.getElementById('player-panel');
  panel.classList.add('visible');
  updatePlayerPanel();
}

function closePlayerPanel() {
  const panel = document.getElementById('player-panel');
  if (panel) {
    panel.classList.remove('visible');
  }
}

function updatePlayerPanel() {
  const listEl = document.getElementById('player-panel-list');
  if (!listEl) return;

  const currentTeam = getCurrentTeam();
  const team = GameState.teams[currentTeam];
  const players = Object.entries(team.players || {});

  // Apply team color
  const panel = document.getElementById('player-panel');
  panel.style.setProperty('--team-color', team.border);

  if (players.length === 0) {
    listEl.innerHTML = '<div class="player-panel-empty">No players in this team.<br>Add players in Team Panel (Tab)</div>';
    return;
  }

  listEl.innerHTML = players.map(([playerId, player]) => {
    const isDead = player.isDead || player.health === 0;
    const statusText = isDead ? '💀 Dead' : (player.position ? player.position : 'Not placed');
    return `
      <div class="player-panel-item ${selectedPlayerId === playerId ? 'selected' : ''} ${isDead ? 'dead' : ''}"
           data-player-id="${playerId}">
        <span class="player-panel-name">${player.name}</span>
        <span class="player-panel-pos">${statusText}</span>
      </div>
    `;
  }).join('');

  // Attach click listeners
  players.forEach(([playerId]) => {
    const item = listEl.querySelector(`[data-player-id="${playerId}"]`);
    if (item) {
      item.addEventListener('click', () => selectPlayer(playerId));
    }
  });
}

// ============================================
// Player Placement
// ============================================

function onPlayerModeHexClick(hexKey, element) {
  if (!selectedPlayerId) {
    console.log('No player selected');
    return;
  }

  const currentTeam = getCurrentTeam();
  const player = GameState.teams[currentTeam]?.players[selectedPlayerId];

  if (!player) return;

  // Check if player is dead - can only revive at own town or castle
  const isDead = player.isDead || player.health === 0;

  if (isDead) {
    // Check if clicking on a town or castle owned by this team
    const hexObj = GameState.hexObjects[hexKey];
    const isOwnTown = hexObj?.type === 'town' && hexObj.teamId === currentTeam;
    const isOwnCastle = hexObj?.type === 'castle' && hexObj.teamId === currentTeam;

    if (!isOwnTown && !isOwnCastle) {
      showNotification('Dead players can only revive at your town or castle', 'error');
      return;
    }

    // Revive the player
    const stats = getPlayerStats(player.gold);
    player.health = stats.health;
    player.maxHealth = stats.health;
    player.isDead = false;
    player.position = hexKey;
    player.revives = (player.revives || 0) + 1;  // Track player revive count

    // Track team revive cost
    const team = GameState.teams[currentTeam];
    if (team) {
      team.reviveCount = (team.reviveCount || 0) + 1;
    }

    showNotification(`${player.name} revived at ${hexObj.type}! (-${REVIVE_COST}g)`);
  } else {
    // Normal placement for living players
    GameState.setPlayerPosition(currentTeam, selectedPlayerId, hexKey);
    console.log(`Placed player ${selectedPlayerId} at ${hexKey}`);
  }

  // Update visuals
  renderPlayerMarkers();
  renderAllHealthBars();
  updatePlayerPanel();
}

// ============================================
// Player Markers on Map
// ============================================

function renderPlayerMarkers() {
  // Remove existing markers and their filters
  document.querySelectorAll('.player-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="player-outline-"]').forEach(f => f.remove());

  // Add markers for all placed players
  for (const [teamId, team] of Object.entries(GameState.teams)) {
    for (const [playerId, player] of Object.entries(team.players || {})) {
      if (player.position) {
        addPlayerMarker(player.position, playerId, player.name, player.gold || 0, team.border);
      }
    }
  }
}

function addPlayerMarker(hexKey, playerId, playerName, playerGold, teamColor) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const rank = getPlayerRank(playerGold);

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.player;
  const iconX = centerX - iconSize / 2;
  const iconY = centerY - iconSize / 2;

  // Create marker group
  const svg = document.getElementById('hex-overlay');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('player-marker');
  marker.setAttribute('data-player-id', playerId);

  // Create SVG filter for team color outline around PNG shape
  const filterId = `player-outline-${playerId}`;
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }

  const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
  filter.setAttribute('id', filterId);
  filter.setAttribute('x', '-25%');
  filter.setAttribute('y', '-25%');
  filter.setAttribute('width', '150%');
  filter.setAttribute('height', '150%');

  // Dilate the alpha channel to create outline shape
  const morphology = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
  morphology.setAttribute('in', 'SourceAlpha');
  morphology.setAttribute('operator', 'dilate');
  morphology.setAttribute('radius', '2');
  morphology.setAttribute('result', 'dilated');

  // Fill dilated shape with team color
  const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
  flood.setAttribute('flood-color', teamColor);
  flood.setAttribute('result', 'color');

  // Mask the flood with dilated alpha
  const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
  composite.setAttribute('in', 'color');
  composite.setAttribute('in2', 'dilated');
  composite.setAttribute('operator', 'in');
  composite.setAttribute('result', 'outline');

  // Merge outline behind original image
  const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
  const mergeOutline = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeOutline.setAttribute('in', 'outline');
  const mergeSource = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
  mergeSource.setAttribute('in', 'SourceGraphic');
  merge.appendChild(mergeOutline);
  merge.appendChild(mergeSource);

  filter.appendChild(morphology);
  filter.appendChild(flood);
  filter.appendChild(composite);
  filter.appendChild(merge);
  defs.appendChild(filter);

  // Rank icon image with outline filter
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', iconX);
  icon.setAttribute('y', iconY);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/icons/${rank.icon}`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('player-marker-icon');

  // Player name above icon
  const name = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  name.setAttribute('x', centerX);
  name.setAttribute('y', iconY - 5);
  name.setAttribute('text-anchor', 'middle');
  name.setAttribute('fill', '#fff');
  name.setAttribute('font-size', '9');
  name.setAttribute('font-weight', 'bold');
  name.classList.add('player-marker-name');
  name.textContent = playerName;

  // Name background for readability
  const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  const nameWidth = playerName.length * 5 + 6;
  nameBg.setAttribute('x', centerX - nameWidth / 2);
  nameBg.setAttribute('y', iconY - 14);
  nameBg.setAttribute('width', nameWidth);
  nameBg.setAttribute('height', 11);
  nameBg.setAttribute('rx', 3);
  nameBg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
  nameBg.setAttribute('stroke', teamColor);
  nameBg.setAttribute('stroke-width', 1);

  marker.appendChild(nameBg);
  marker.appendChild(name);
  marker.appendChild(icon);
  svg.appendChild(marker);
}

function clearPlayerMarker(playerId) {
  const marker = document.querySelector(`.player-marker[data-player-id="${playerId}"]`);
  if (marker) {
    marker.remove();
  }
  // Clean up the filter
  const filter = document.getElementById(`player-outline-${playerId}`);
  if (filter) {
    filter.remove();
  }
}
