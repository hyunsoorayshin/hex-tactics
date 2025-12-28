// ============================================
// Team Panel Module
// ============================================

let teamPanelOpen = false;

function isTeamPanelOpen() {
  return teamPanelOpen;
}

function openTeamPanel() {
  const panel = document.getElementById('team-panel');
  const overlay = document.getElementById('team-panel-overlay');

  panel.classList.add('visible');
  overlay.classList.add('visible');
  teamPanelOpen = true;

  updateTeamPanel();
}

function closeTeamPanel() {
  const panel = document.getElementById('team-panel');
  const overlay = document.getElementById('team-panel-overlay');

  panel.classList.remove('visible');
  overlay.classList.remove('visible');
  teamPanelOpen = false;
}

function toggleTeamPanel() {
  if (teamPanelOpen) {
    closeTeamPanel();
  } else {
    openTeamPanel();
  }
}

function updateTeamPanel() {
  const currentTeam = getCurrentTeam();
  const team = GameState.teams[currentTeam];
  const teamConfig = TEAMS[currentTeam];

  // Update header
  document.getElementById('team-panel-color').style.background = teamConfig.border;
  document.getElementById('team-panel-name').value = team.name;

  // Update stats
  document.getElementById('stat-gold').textContent = GameState.getTeamGold(currentTeam);
  document.getElementById('stat-land').textContent = GameState.getTeamLandCount(currentTeam);
  const assets = GameState.getTeamAssets(currentTeam);
  document.getElementById('stat-assets').textContent = assets.hexObjects + assets.edgeObjects;

  // Update player list
  renderPlayerList();
}

function renderPlayerList() {
  const playerList = document.getElementById('player-list');
  const currentTeam = getCurrentTeam();
  const team = GameState.teams[currentTeam];
  const players = Object.entries(team.players || {});

  if (players.length === 0) {
    playerList.innerHTML = '<div class="empty-message">No players yet. Click "+ Add Player" to add students.</div>';
    return;
  }

  playerList.innerHTML = players.map(([playerId, player]) => `
    <div class="player-item" data-player-id="${playerId}">
      <input type="text" class="player-name" value="${player.name}">
      <div class="player-gold">
        <span class="player-gold-icon">&#9733;</span>
        <input type="number" class="player-gold-input" value="${player.gold}" min="0">
      </div>
      <button class="player-remove">&times;</button>
    </div>
  `).join('');

  // Attach event listeners (CSP blocks inline handlers)
  players.forEach(([playerId]) => {
    const item = playerList.querySelector(`[data-player-id="${playerId}"]`);
    if (!item) return;

    item.querySelector('.player-name').addEventListener('input', (e) => {
      updatePlayerName(playerId, e.target.value);
    });

    item.querySelector('.player-gold-input').addEventListener('input', (e) => {
      updatePlayerGold(playerId, parseInt(e.target.value) || 0);
    });

    item.querySelector('.player-remove').addEventListener('click', () => {
      removePlayer(playerId);
    });
  });
}

function addPlayer() {
  const currentTeam = getCurrentTeam();
  const playerId = 'player_' + Date.now();
  GameState.addPlayer(currentTeam, playerId, 'New Student', 0);
  renderPlayerList();
  updateTeamStats();

  // Focus the new player's name input
  setTimeout(() => {
    const newInput = document.querySelector(`[data-player-id="${playerId}"] .player-name`);
    if (newInput) {
      newInput.select();
      newInput.focus();
    }
  }, 10);
}

function updatePlayerName(playerId, name) {
  const currentTeam = getCurrentTeam();
  if (GameState.teams[currentTeam]?.players[playerId]) {
    GameState.teams[currentTeam].players[playerId].name = name;
  }
}

function updatePlayerGold(playerId, gold) {
  const currentTeam = getCurrentTeam();
  GameState.setPlayerGold(currentTeam, playerId, gold);
  updateTeamStats();
}

function removePlayer(playerId) {
  const currentTeam = getCurrentTeam();
  GameState.removePlayer(currentTeam, playerId);
  renderPlayerList();
  updateTeamStats();
}

function updateTeamStats() {
  const currentTeam = getCurrentTeam();
  document.getElementById('stat-gold').textContent = GameState.getTeamGold(currentTeam);
}

function updateTeamName(name) {
  const currentTeam = getCurrentTeam();
  if (GameState.teams[currentTeam]) {
    GameState.teams[currentTeam].name = name;
  }
}

function initTeamPanel() {
  // Close button
  document.getElementById('team-panel-close').addEventListener('click', closeTeamPanel);

  // Overlay click to close
  document.getElementById('team-panel-overlay').addEventListener('click', closeTeamPanel);

  // Add player button
  document.getElementById('add-player-btn').addEventListener('click', addPlayer);

  // Team name change
  document.getElementById('team-panel-name').addEventListener('change', (e) => {
    updateTeamName(e.target.value);
  });
}
