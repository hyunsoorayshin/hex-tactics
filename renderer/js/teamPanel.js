// ============================================
// Team Panel Module
// ============================================

let teamPanelOpen = false;

// Count specific asset types for a team
function getTeamAssetCounts(teamId) {
  const counts = {
    castle: 0,
    wall: 0,
    town: 0,
    army: 0,
    ship: 0,
    bridge: 0
  };

  // Count hex objects
  for (const obj of Object.values(GameState.hexObjects)) {
    if (obj.teamId === teamId) {
      if (obj.type === 'castle') counts.castle++;
      else if (obj.type === 'town') counts.town++;
      else if (obj.type === 'army') counts.army++;
      else if (obj.type === 'ship') counts.ship++;
      else if (obj.type === 'bridge') counts.bridge++;
    }
  }

  // Count edge objects
  for (const obj of Object.values(GameState.edgeObjects)) {
    if (obj.teamId === teamId) {
      if (obj.type === 'wall') counts.wall++;
    }
  }

  return counts;
}

function isTeamPanelOpen() {
  return teamPanelOpen;
}

function createTeamPanelHTML() {
  const panel = document.getElementById('team-panel');
  panel.innerHTML = `
    <div class="corner-tr"></div>
    <div class="corner-bl"></div>
    <button id="team-panel-close">&times;</button>

    <div id="team-panel-content">
      <div id="team-mascot">
        <img id="team-mascot-img" src="" alt="Team Mascot">
        <div id="team-mascot-placeholder">No Mascot</div>
      </div>

      <div id="team-panel-header">
        <div id="team-panel-color"></div>
        <input type="text" id="team-panel-name" value="Team Name">
      </div>

      <div class="divider-medieval"></div>

      <div class="team-stats team-stats-3col">
        <div class="team-stat">
          <div class="team-stat-value" id="stat-merit">0</div>
          <div class="team-stat-label">Merit Points</div>
        </div>
        <div class="team-stat">
          <div class="team-stat-value" id="stat-available">0</div>
          <div class="team-stat-label">Available Gold</div>
        </div>
        <div class="team-stat">
          <div class="team-stat-value" id="stat-land">0</div>
          <div class="team-stat-label">Land</div>
        </div>
      </div>

      <div class="divider-medieval"></div>

      <div class="team-section">
        <div class="team-section-header">
          <span class="team-section-title">Assets</span>
        </div>
        <div class="asset-grid">
          <div class="asset-item">
            <span class="asset-icon">&#127984;</span>
            <span class="asset-value" id="asset-castle">0</span>
            <span class="asset-label">Castle</span>
          </div>
          <div class="asset-item">
            <span class="asset-icon">&#129521;</span>
            <span class="asset-value" id="asset-wall">0</span>
            <span class="asset-label">Wall</span>
          </div>
          <div class="asset-item">
            <span class="asset-icon">&#127960;</span>
            <span class="asset-value" id="asset-town">0</span>
            <span class="asset-label">Town</span>
          </div>
          <div class="asset-item">
            <span class="asset-icon">&#9876;</span>
            <span class="asset-value" id="asset-army">0</span>
            <span class="asset-label">Army</span>
          </div>
          <div class="asset-item">
            <span class="asset-icon">&#9973;</span>
            <span class="asset-value" id="asset-ship">0</span>
            <span class="asset-label">Ship</span>
          </div>
          <div class="asset-item">
            <span class="asset-icon">&#128739;</span>
            <span class="asset-value" id="asset-bridge">0</span>
            <span class="asset-label">Bridge</span>
          </div>
        </div>
      </div>

      <div class="divider-medieval"></div>

      <div class="team-section">
        <div class="team-section-header">
          <span class="team-section-title">Players / Students</span>
          <button class="team-section-add" id="add-player-btn">+ Add Player</button>
        </div>
        <div class="player-list" id="player-list"></div>
      </div>
    </div>
  `;
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
  const panel = document.getElementById('team-panel');

  // Apply team color as CSS custom property
  panel.style.setProperty('--team-color', team.border);
  panel.style.setProperty('--team-glow', team.color);

  // Update mascot
  const mascotImg = document.getElementById('team-mascot-img');
  const teamNum = currentTeam === 0 ? 10 : currentTeam;
  mascotImg.src = `../assets/mascots/team${teamNum}.png`;
  mascotImg.onload = () => mascotImg.classList.add('visible');
  mascotImg.onerror = () => mascotImg.classList.remove('visible');

  // Update header
  document.getElementById('team-panel-color').style.background = team.border;
  document.getElementById('team-panel-name').value = team.name;

  // Update stats
  document.getElementById('stat-merit').textContent = GameState.getTeamGold(currentTeam);
  document.getElementById('stat-available').textContent = GameState.getTeamAvailableGold(currentTeam);
  document.getElementById('stat-land').textContent = GameState.getTeamLandCount(currentTeam);

  // Update asset counts with lost numbers in parentheses
  const assetCounts = getTeamAssetCounts(currentTeam);
  const lost = team.objectsLost || {};

  const formatAsset = (count, lostCount) => {
    return lostCount > 0 ? `${count} (${lostCount})` : `${count}`;
  };

  document.getElementById('asset-castle').textContent = formatAsset(assetCounts.castle, lost.castle || 0);
  document.getElementById('asset-wall').textContent = formatAsset(assetCounts.wall, lost.wall || 0);
  document.getElementById('asset-town').textContent = formatAsset(assetCounts.town, lost.town || 0);
  document.getElementById('asset-army').textContent = formatAsset(assetCounts.army, lost.army || 0);
  document.getElementById('asset-ship').textContent = formatAsset(assetCounts.ship, lost.ship || 0);
  document.getElementById('asset-bridge').textContent = formatAsset(assetCounts.bridge, lost.bridge || 0);

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

  playerList.innerHTML = players.map(([playerId, player]) => {
    const effectiveGold = getEffectiveGold(player);
    const stats = getPlayerStats(effectiveGold);
    const rank = getPlayerRank(effectiveGold);
    const nextLevelGold = getGoldForLevel(stats.level + 1);
    return `
    <div class="player-item" data-player-id="${playerId}">
      <input type="text" class="player-name" value="${player.name}">
      <div class="player-gold">
        <span class="player-gold-icon">&#9733;</span>
        <span class="player-gold-value">${effectiveGold}g</span>
      </div>
      <div class="player-level-row">
        <span class="player-level-badge" title="${rank.name}">Lv.${stats.level}</span>
        <span class="player-level-detail" title="Next level at ${nextLevelGold}g">HP:${stats.health} ATK:${stats.attack}</span>
      </div>
      <div class="player-honor-row">
        <button class="honor-btn honor" title="Honor: +50g">&#9813;</button>
        <span class="player-stat-badge honor" title="Honor points">${player.honor || 0}H</span>
        <span class="player-stat-badge dishonor" title="Dishonor points">${player.dishonor || 0}D</span>
        <button class="honor-btn dishonor" title="Dishonor: -50g">&#9760;</button>
      </div>
      <div class="player-stats-row">
        <span class="player-stat-badge kills" title="Kills">${player.kills || 0}K</span>
        <span class="player-stat-badge deaths" title="Deaths">${player.deaths || 0}D</span>
        <span class="player-stat-badge revives" title="Revives">${player.revives || 0}R</span>
      </div>
      <select class="player-transfer" title="Transfer to another team">
        <option value="">Move</option>
        ${Object.entries(GameState.teams)
          .filter(([id]) => parseInt(id) !== currentTeam)
          .map(([id, team]) => `<option value="${id}">${id === '0' ? 10 : id}. ${team.name}</option>`)
          .join('')}
      </select>
      <button class="player-remove">&times;</button>
    </div>
  `;
  }).join('');

  // Attach event listeners (CSP blocks inline handlers)
  players.forEach(([playerId]) => {
    const item = playerList.querySelector(`[data-player-id="${playerId}"]`);
    if (!item) return;

    item.querySelector('.player-name').addEventListener('input', (e) => {
      updatePlayerName(playerId, e.target.value);
    });

    item.querySelector('.honor-btn.honor').addEventListener('click', () => {
      applyHonor(playerId, true);
    });

    item.querySelector('.honor-btn.dishonor').addEventListener('click', () => {
      applyHonor(playerId, false);
    });

    item.querySelector('.player-transfer').addEventListener('change', (e) => {
      const targetTeam = parseInt(e.target.value);
      if (isNaN(targetTeam)) return;
      const player = GameState.teams[currentTeam]?.players[playerId];
      if (!player) return;
      const targetName = GameState.teams[targetTeam].name;
      if (GameState.transferPlayer(currentTeam, targetTeam, playerId)) {
        showNotification(`${player.name} transferred to ${targetName}`);
        renderPlayerMarkers();
        renderAllHealthBars();
        renderPlayerList();
        updateTeamStats();
      }
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

function applyHonor(playerId, isHonor) {
  const currentTeam = getCurrentTeam();
  const player = GameState.teams[currentTeam]?.players[playerId];
  if (!player) return;

  if (isHonor) {
    player.honor = (player.honor || 0) + 1;
    showNotification(`${player.name} received honor! +${HONOR_GOLD}g`);
  } else {
    player.dishonor = (player.dishonor || 0) + 1;
    showNotification(`${player.name} received dishonor! -${HONOR_GOLD}g`);
  }

  refreshAllPlayerStats();
  renderPlayerList();
  renderPlayerMarkers();
  renderAllHealthBars();
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
  document.getElementById('stat-merit').textContent = GameState.getTeamGold(currentTeam);
  document.getElementById('stat-available').textContent = GameState.getTeamAvailableGold(currentTeam);
}

function updateTeamName(name) {
  const currentTeam = getCurrentTeam();
  if (GameState.teams[currentTeam]) {
    GameState.teams[currentTeam].name = name;
  }
}

function initTeamPanel() {
  // Create the panel HTML
  createTeamPanelHTML();

  // Close button
  document.getElementById('team-panel-close').addEventListener('click', closeTeamPanel);

  // Overlay click to close
  document.getElementById('team-panel-overlay').addEventListener('click', closeTeamPanel);

  // Add player button
  document.getElementById('add-player-btn').addEventListener('click', addPlayer);

  // Team name change
  document.getElementById('team-panel-name').addEventListener('input', (e) => {
    updateTeamName(e.target.value);
  });
}
