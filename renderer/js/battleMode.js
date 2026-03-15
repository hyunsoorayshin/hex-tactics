// ============================================
// Battle Mode Module
// ============================================

let battleMode = false;
let battlePhase = null; // 'select_attacker' | 'select_target'
let selectedAttacker = null; // { type: 'player'|'ship_with_passenger', hexKey, teamId, playerId?, ... }

function isBattleMode() {
  return battleMode;
}

function setBattleMode(enabled) {
  battleMode = enabled;
  if (enabled) {
    battlePhase = 'select_attacker';
    showBattleHint();
  } else {
    hideBattleHint();
    clearBattleSelection();
  }
}

function toggleBattleMode() {
  setBattleMode(!battleMode);
  return battleMode;
}

function clearBattleSelection() {
  selectedAttacker = null;
  battlePhase = battleMode ? 'select_attacker' : null;
  updateBattleHint();
  // Remove selection highlight
  document.querySelectorAll('.battle-selected').forEach(el => el.classList.remove('battle-selected'));
}

function getBattlePhase() {
  return battlePhase;
}

// ============================================
// Battle Hint UI
// ============================================

function showBattleHint() {
  let hint = document.getElementById('battle-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'battle-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateBattleHint();
  hint.classList.add('visible');
}

function hideBattleHint() {
  const hint = document.getElementById('battle-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateBattleHint() {
  const hint = document.getElementById('battle-hint');
  if (!hint) return;

  if (battlePhase === 'select_target') {
    const name = selectedAttacker?.name || 'Attacker';
    hint.textContent = `Select target for ${name} to attack`;
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Select a player or ship with passenger to attack';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Battle Logic
// ============================================

function onBattleModeHexClick(hexKey, element, shiftKey) {
  if (battlePhase === 'select_target') {
    executeAttack(hexKey, false);
    return;
  }

  // Select attacker phase
  const attacker = getAttackerAtHex(hexKey);
  if (attacker) {
    selectAttacker(hexKey, attacker);
  } else {
    showNotification('No attacker here (need player or ship with passenger)', 'error');
  }
}

function onBattleModeEdgeClick(edgeKey, element, shiftKey) {
  if (battlePhase === 'select_target') {
    executeAttack(edgeKey, true);
    return;
  }

  // Walls can't be attackers
  showNotification('Walls cannot attack', 'error');
}

function getAttackerAtHex(hexKey) {
  // Check for player at hex
  const players = GameState.getPlayersAtHex(hexKey);
  if (players.length > 0) {
    const { teamId, playerId, player } = players[0];
    return {
      type: 'player',
      hexKey,
      teamId,
      playerId,
      player,
      name: player.name
    };
  }

  // Check for ship with passenger
  const ship = GameState.hexObjects[hexKey];
  if (ship?.type === 'ship' && ship.passenger) {
    const passengerTeam = GameState.teams[ship.passenger.teamId];
    const passenger = passengerTeam?.players[ship.passenger.playerId];
    if (passenger) {
      return {
        type: 'ship_with_passenger',
        hexKey,
        teamId: ship.teamId,
        shipData: ship,
        passenger: ship.passenger,
        passengerData: passenger,
        name: `${ship.passenger.name} (on ship)`
      };
    }
  }

  return null;
}

function getTargetAtHex(hexKey) {
  // Check for player at hex
  const players = GameState.getPlayersAtHex(hexKey);
  if (players.length > 0) {
    const { teamId, playerId, player } = players[0];
    return {
      type: 'player',
      hexKey,
      teamId,
      playerId,
      player,
      name: player.name
    };
  }

  // Check for hex object
  const obj = GameState.hexObjects[hexKey];
  if (obj) {
    // Skip territory markers
    if (obj.type === 'castle-territory' || obj.type === 'town-territory') {
      return null;
    }

    // Ship with passenger - target is the ship itself
    return {
      type: obj.type,
      hexKey,
      teamId: obj.teamId,
      data: obj,
      name: obj.type,
      isObject: true
    };
  }

  return null;
}

function getTargetAtEdge(edgeKey) {
  // Check for edge object (wall)
  const obj = GameState.edgeObjects[edgeKey];
  if (obj) {
    return {
      type: obj.type,
      edgeKey,
      teamId: obj.teamId,
      data: obj,
      name: obj.type,
      isEdgeObject: true
    };
  }

  return null;
}

function selectAttacker(hexKey, attacker) {
  selectedAttacker = attacker;
  battlePhase = 'select_target';
  updateBattleHint();
  highlightAttacker(hexKey);
  showNotification(`${attacker.name} ready to attack`);
}

function getAttackerStats(attacker) {
  if (attacker.type === 'player') {
    const stats = getPlayerStats(getEffectiveGold(attacker.player));
    const currentHealth = attacker.player.health !== undefined ? attacker.player.health : stats.health;
    return {
      attack: stats.attack,
      health: currentHealth,
      maxHealth: stats.health
    };
  } else if (attacker.type === 'ship_with_passenger') {
    const stats = getPlayerStats(getEffectiveGold(attacker.passengerData));
    const currentHealth = attacker.passengerData.health !== undefined ? attacker.passengerData.health : stats.health;
    return {
      attack: stats.attack,
      health: currentHealth,
      maxHealth: stats.health
    };
  }
  return { attack: 0, health: 0, maxHealth: 0 };
}

function getTargetStats(target) {
  if (target.type === 'player') {
    const stats = getPlayerStats(getEffectiveGold(target.player));
    const currentHealth = target.player.health !== undefined ? target.player.health : stats.health;
    return {
      attack: stats.attack,
      health: currentHealth,
      maxHealth: stats.health,
      isPlayer: true
    };
  } else if (target.isObject || target.isEdgeObject) {
    const maxHealth = OBJECT_HEALTH[target.type] || 100;
    const currentHealth = target.data.health !== undefined ? target.data.health : maxHealth;
    return {
      attack: 0,
      health: currentHealth,
      maxHealth: maxHealth,
      isPlayer: false
    };
  }
  return { attack: 0, health: 0, maxHealth: 0, isPlayer: false };
}

function executeAttack(targetKey, isEdge = false) {
  const target = isEdge ? getTargetAtEdge(targetKey) : getTargetAtHex(targetKey);

  if (!target) {
    showNotification('No valid target', 'error');
    clearBattleSelection();
    return;
  }

  // Can't attack yourself (only applies to hex objects, not edges)
  if (!isEdge && targetKey === selectedAttacker.hexKey) {
    showNotification('Cannot attack yourself', 'error');
    clearBattleSelection();
    return;
  }

  const attackerStats = getAttackerStats(selectedAttacker);
  const targetStats = getTargetStats(target);

  // Initialize health if not set
  initializeHealth(selectedAttacker);
  initializeHealth(target);

  // Get attacker's team/player ID for stat tracking
  let attackerTeamId, attackerPlayerId;
  if (selectedAttacker.type === 'player') {
    attackerTeamId = selectedAttacker.teamId;
    attackerPlayerId = selectedAttacker.playerId;
  } else if (selectedAttacker.type === 'ship_with_passenger') {
    attackerTeamId = selectedAttacker.passenger?.teamId;
    attackerPlayerId = selectedAttacker.passenger?.playerId;
  }

  // Get target's team/player ID for mutual damage stat tracking
  let targetTeamId, targetPlayerId;
  if (target.type === 'player') {
    targetTeamId = target.teamId;
    targetPlayerId = target.playerId;
  }

  // Apply damage to target
  const targetDamage = attackerStats.attack;
  applyDamage(target, targetDamage, attackerTeamId, attackerPlayerId);

  let resultMessage = `${selectedAttacker.name} dealt ${targetDamage} damage to ${target.name}`;

  // If target is a player, mutual damage (target fights back)
  if (target.type === 'player') {
    const attackerDamage = targetStats.attack;
    applyDamage(selectedAttacker, attackerDamage, targetTeamId, targetPlayerId);
    resultMessage += ` and took ${attackerDamage} damage back`;
  }

  showNotification(resultMessage);

  // Re-render everything
  renderAllHealthBars();
  renderPlayerMarkers();
  renderShips();
  renderArmies();
  renderTowns();
  renderCastles();
  renderBridges();
  renderWalls();

  clearBattleSelection();
}

function initializeHealth(entity) {
  if (entity.type === 'player') {
    const player = entity.player || GameState.teams[entity.teamId]?.players[entity.playerId];
    if (player && player.health === undefined) {
      const stats = getPlayerStats(getEffectiveGold(player));
      player.health = stats.health;
      player.maxHealth = stats.health;
    }
  } else if (entity.type === 'ship_with_passenger') {
    const passenger = entity.passengerData;
    if (passenger && passenger.health === undefined) {
      const stats = getPlayerStats(getEffectiveGold(passenger));
      passenger.health = stats.health;
      passenger.maxHealth = stats.health;
    }
  } else if (entity.isObject) {
    const obj = entity.data || GameState.hexObjects[entity.hexKey];
    if (obj && obj.health === undefined) {
      obj.health = OBJECT_HEALTH[entity.type] || 100;
      obj.maxHealth = obj.health;
    }
  } else if (entity.isEdgeObject) {
    const obj = entity.data || GameState.edgeObjects[entity.edgeKey];
    if (obj && obj.health === undefined) {
      obj.health = OBJECT_HEALTH[entity.type] || 100;
      obj.maxHealth = obj.health;
    }
  }
}

function applyDamage(target, damage, attackerTeamId, attackerPlayerId) {
  if (target.type === 'player') {
    const player = target.player || GameState.teams[target.teamId]?.players[target.playerId];
    if (!player) return;

    player.health -= damage;

    if (player.health <= 0) {
      destroyPlayer(target.teamId, target.playerId, target.name, attackerTeamId, attackerPlayerId);
    }
  } else if (target.type === 'ship_with_passenger') {
    // For ship with passenger being attacked as attacker taking damage
    const passenger = target.passengerData;
    if (!passenger) return;

    passenger.health -= damage;

    if (passenger.health <= 0) {
      // Passenger dies - track stats
      const passengerTeamId = target.passenger?.teamId;
      const passengerPlayerId = target.passenger?.playerId;
      if (passengerTeamId !== undefined && passengerPlayerId) {
        const passengerPlayer = GameState.teams[passengerTeamId]?.players[passengerPlayerId];
        if (passengerPlayer) {
          passengerPlayer.deaths = (passengerPlayer.deaths || 0) + 1;
        }
        // Credit kill to attacker
        if (attackerTeamId !== undefined && attackerPlayerId) {
          const attacker = GameState.teams[attackerTeamId]?.players[attackerPlayerId];
          if (attacker) {
            attacker.kills = (attacker.kills || 0) + 1;
          }
        }
      }

      // Also destroy ship - track objectsLost per type
      const ship = GameState.hexObjects[target.hexKey];
      if (ship) {
        if (ship.teamId !== undefined && GameState.teams[ship.teamId]) {
          const team = GameState.teams[ship.teamId];
          if (!team.objectsLost) team.objectsLost = {};
          team.objectsLost.ship = (team.objectsLost.ship || 0) + 1;
        }
        // Credit ship kill to attacker
        if (attackerTeamId !== undefined && attackerPlayerId) {
          const attacker = GameState.teams[attackerTeamId]?.players[attackerPlayerId];
          if (attacker) {
            attacker.kills = (attacker.kills || 0) + 1;
          }
        }
        delete ship.passenger;
        delete GameState.hexObjects[target.hexKey];
        showNotification(`${target.name} and ship destroyed!`);
      }
    }
  } else if (target.isObject) {
    const obj = target.data || GameState.hexObjects[target.hexKey];
    if (!obj) return;

    obj.health -= damage;

    if (obj.health <= 0) {
      destroyObject(target.hexKey, target.type, target.name, target.teamId, attackerTeamId, attackerPlayerId);
    }
  } else if (target.isEdgeObject) {
    const obj = target.data || GameState.edgeObjects[target.edgeKey];
    if (!obj) return;

    obj.health -= damage;

    if (obj.health <= 0) {
      destroyEdgeObject(target.edgeKey, target.type, target.name, target.teamId, attackerTeamId, attackerPlayerId);
    }
  }
}

function destroyPlayer(teamId, playerId, name, attackerTeamId, attackerPlayerId) {
  // Don't remove player - mark as dead instead (can revive at town/castle)
  const player = GameState.teams[teamId]?.players[playerId];
  if (player) {
    player.position = null;  // Remove from map
    player.health = 0;       // Mark as dead
    player.isDead = true;    // Dead flag for UI
    player.deaths = (player.deaths || 0) + 1;  // Track death
  }

  // Credit the kill to the attacker
  if (attackerTeamId !== undefined && attackerPlayerId) {
    const attacker = GameState.teams[attackerTeamId]?.players[attackerPlayerId];
    if (attacker) {
      attacker.kills = (attacker.kills || 0) + 1;
    }
  }

  showNotification(`${name} was defeated! Can revive at town or castle.`);
}

function destroyObject(hexKey, type, name, ownerTeamId, attackerTeamId, attackerPlayerId) {
  // Track objectsLost per type for the owner team
  if (ownerTeamId !== undefined && GameState.teams[ownerTeamId]) {
    const team = GameState.teams[ownerTeamId];
    if (!team.objectsLost) team.objectsLost = {};
    team.objectsLost[type] = (team.objectsLost[type] || 0) + 1;
  }

  // Credit the kill to the attacker (objects count as kills too)
  if (attackerTeamId !== undefined && attackerPlayerId) {
    const attacker = GameState.teams[attackerTeamId]?.players[attackerPlayerId];
    if (attacker) {
      attacker.kills = (attacker.kills || 0) + 1;
    }
  }

  // Handle special cases
  if (type === 'ship') {
    const ship = GameState.hexObjects[hexKey];
    // If ship has passenger, passenger dies too (but not removed)
    if (ship?.passenger) {
      const { teamId, playerId, name: passengerName } = ship.passenger;
      destroyPlayer(teamId, playerId, passengerName, attackerTeamId, attackerPlayerId);
      showNotification(`${passengerName} went down with the ship!`);
    }
  } else if (type === 'castle') {
    // Only remove castle center, territory remains per rules
    // Territory hexes keep their castle-territory type but orphaned
  }

  delete GameState.hexObjects[hexKey];
  showNotification(`${name} was destroyed!`);
}

function destroyEdgeObject(edgeKey, type, name, ownerTeamId, attackerTeamId, attackerPlayerId) {
  // Track objectsLost per type for the owner team
  if (ownerTeamId !== undefined && GameState.teams[ownerTeamId]) {
    const team = GameState.teams[ownerTeamId];
    if (!team.objectsLost) team.objectsLost = {};
    team.objectsLost[type] = (team.objectsLost[type] || 0) + 1;
  }

  // Credit the kill to the attacker (objects count as kills too)
  if (attackerTeamId !== undefined && attackerPlayerId) {
    const attacker = GameState.teams[attackerTeamId]?.players[attackerPlayerId];
    if (attacker) {
      attacker.kills = (attacker.kills || 0) + 1;
    }
  }

  delete GameState.edgeObjects[edgeKey];
  showNotification(`${name} was destroyed!`);
}

function highlightAttacker(hexKey) {
  // Add visual highlight to the attacker
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (hexEl) {
    hexEl.classList.add('battle-selected');
  }

  // Also highlight markers
  document.querySelectorAll(`.ship-marker[data-hex="${hexKey}"], .player-marker`).forEach(m => {
    if (m.getAttribute('data-hex') === hexKey) {
      m.classList.add('battle-selected');
    }
  });
}

// ============================================
// Health Bar Rendering
// ============================================

function renderHealthBar(hexKey, currentHealth, maxHealth, yOffset) {
  // Don't render if at full health
  if (currentHealth >= maxHealth) return;

  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const barWidth = 40;
  const barHeight = 6;
  const healthPercent = Math.max(0, currentHealth / maxHealth);

  // Get or create health bar layer (always on top)
  const svg = document.getElementById('hex-overlay');
  let healthLayer = document.getElementById('health-bar-layer');
  if (!healthLayer) {
    healthLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    healthLayer.id = 'health-bar-layer';
    svg.appendChild(healthLayer);
  }

  // Container group
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  container.classList.add('health-bar-container');
  container.setAttribute('data-health-bar', hexKey);

  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', centerX - barWidth / 2);
  bg.setAttribute('y', centerY + yOffset);
  bg.setAttribute('width', barWidth);
  bg.setAttribute('height', barHeight);
  bg.setAttribute('rx', 2);
  bg.classList.add('health-bar-bg');

  // Health fill
  const fill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fill.setAttribute('x', centerX - barWidth / 2 + 1);
  fill.setAttribute('y', centerY + yOffset + 1);
  fill.setAttribute('width', (barWidth - 2) * healthPercent);
  fill.setAttribute('height', barHeight - 2);
  fill.setAttribute('rx', 1);
  fill.classList.add('health-bar-fill');

  // Color based on health percentage
  if (healthPercent > 0.6) {
    fill.classList.add('health-high');
  } else if (healthPercent > 0.3) {
    fill.classList.add('health-medium');
  } else {
    fill.classList.add('health-low');
  }

  container.appendChild(bg);
  container.appendChild(fill);
  healthLayer.appendChild(container);
}

function renderEdgeHealthBar(edgeKey, currentHealth, maxHealth) {
  // Don't render if at full health
  if (currentHealth >= maxHealth) return;

  // Parse edge key: "q,r,side"
  const parts = edgeKey.split(',');
  const q = parseInt(parts[0]);
  const r = parseInt(parts[1]);
  const side = parseInt(parts[2]);

  const hex = new Hex(q, r);
  const corners = getHexCorners(hex);
  const p1 = corners[side];
  const p2 = corners[(side + 1) % 6];

  // Calculate edge center
  const centerX = (p1.x + p2.x) / 2;
  const centerY = (p1.y + p2.y) / 2;

  const barWidth = 30;
  const barHeight = 5;
  const healthPercent = Math.max(0, currentHealth / maxHealth);

  // Get or create health bar layer (always on top)
  const svg = document.getElementById('hex-overlay');
  let healthLayer = document.getElementById('health-bar-layer');
  if (!healthLayer) {
    healthLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    healthLayer.id = 'health-bar-layer';
    svg.appendChild(healthLayer);
  }

  // Container group
  const container = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  container.classList.add('health-bar-container');
  container.setAttribute('data-health-bar', edgeKey);

  // Background
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', centerX - barWidth / 2);
  bg.setAttribute('y', centerY + 15);
  bg.setAttribute('width', barWidth);
  bg.setAttribute('height', barHeight);
  bg.setAttribute('rx', 2);
  bg.classList.add('health-bar-bg');

  // Health fill
  const fill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  fill.setAttribute('x', centerX - barWidth / 2 + 1);
  fill.setAttribute('y', centerY + 16);
  fill.setAttribute('width', (barWidth - 2) * healthPercent);
  fill.setAttribute('height', barHeight - 2);
  fill.setAttribute('rx', 1);
  fill.classList.add('health-bar-fill');

  // Color based on health percentage
  if (healthPercent > 0.6) {
    fill.classList.add('health-high');
  } else if (healthPercent > 0.3) {
    fill.classList.add('health-medium');
  } else {
    fill.classList.add('health-low');
  }

  container.appendChild(bg);
  container.appendChild(fill);
  healthLayer.appendChild(container);
}

function renderAllHealthBars() {
  // Remove existing health bars
  document.querySelectorAll('.health-bar-container').forEach(h => h.remove());

  // Ensure health bar layer is on top by re-appending it
  const svg = document.getElementById('hex-overlay');
  let healthLayer = document.getElementById('health-bar-layer');
  if (healthLayer) {
    svg.appendChild(healthLayer); // Move to end (top layer)
  }

  // Render for hex objects (bottom of object)
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.health !== undefined && obj.maxHealth !== undefined && obj.health < obj.maxHealth) {
      // Use larger offset for castle since it's bigger
      renderHealthBar(hexKey, obj.health, obj.maxHealth, getHealthBarOffset(obj.type));
    }
  }

  // Render for players (above player icon)
  for (const [teamId, team] of Object.entries(GameState.teams)) {
    for (const [playerId, player] of Object.entries(team.players || {})) {
      if (player.position && player.health !== undefined && player.maxHealth !== undefined && player.health < player.maxHealth) {
        renderHealthBar(player.position, player.health, player.maxHealth, getHealthBarOffset('player'));
      }
    }
  }

  // Render for edge objects (walls)
  for (const [edgeKey, obj] of Object.entries(GameState.edgeObjects)) {
    if (obj.health !== undefined && obj.maxHealth !== undefined && obj.health < obj.maxHealth) {
      renderEdgeHealthBar(edgeKey, obj.health, obj.maxHealth);
    }
  }
}
