// ============================================
// Move Mode Module
// ============================================

let moveMode = false;
let movePhase = null; // 'select_object' | 'select_destination'
let selectedMoveObject = null; // { type, hexKey, isPlayer, isHexObject, data }

function isMoveMode() {
  return moveMode;
}

function setMoveMode(enabled) {
  moveMode = enabled;
  if (enabled) {
    movePhase = 'select_object';
    showMoveHint();
  } else {
    hideMoveHint();
    clearMoveSelection();
  }
}

function toggleMoveMode() {
  setMoveMode(!moveMode);
  return moveMode;
}

function clearMoveSelection() {
  selectedMoveObject = null;
  cachedReachable = null;
  movePhase = moveMode ? 'select_object' : null;
  updateMoveHint();
  clearMoveRange();
  // Remove selection highlight
  document.querySelectorAll('.move-selected').forEach(el => el.classList.remove('move-selected'));
}

function getMovePhase() {
  return movePhase;
}

// ============================================
// Move Hint UI
// ============================================

function showMoveHint() {
  let hint = document.getElementById('move-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'move-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateMoveHint();
  hint.classList.add('visible');
}

function hideMoveHint() {
  const hint = document.getElementById('move-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateMoveHint() {
  const hint = document.getElementById('move-hint');
  if (!hint) return;

  if (movePhase === 'select_destination') {
    const name = selectedMoveObject?.type || 'object';
    const speed = selectedMoveObject?.speed || 0;
    const isNaval = name === 'ship' || name === 'fleet';
    hint.textContent = isNaval
      ? `Click destination to move ${name} (range: ${speed} hexes)`
      : `Click destination to move ${name} (range: ${speed} + free on team land)`;
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click an object or player to move';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Move Logic
// ============================================

// BFS pathfinding: team land = 0 cost, non-team land = 1 cost
// Returns a Map of hexKey -> cost for all reachable hexes within budget
function computeReachable(fromHexKey, speed, teamId) {
  const costs = new Map(); // hexKey -> minimum cost to reach
  costs.set(fromHexKey, 0);

  // Priority queue (simple sorted array since costs are 0 or 1)
  // Use deque-style BFS: cost-0 neighbors go to front, cost-1 go to back
  const queue = [{ hexKey: fromHexKey, cost: 0 }];

  while (queue.length > 0) {
    const { hexKey, cost } = queue.shift();

    // Skip if we already found a cheaper path
    if (cost > (costs.get(hexKey) ?? Infinity)) continue;

    const [q, r] = hexKey.split(',').map(Number);

    for (const dir of [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ]) {
      const nKey = `${q + dir.q},${r + dir.r}`;
      const isTeamLand = GameState.land[nKey] === teamId;
      const stepCost = isTeamLand ? 0 : 1;
      const newCost = cost + stepCost;

      if (newCost > speed) continue;
      if (newCost >= (costs.get(nKey) ?? Infinity)) continue;

      costs.set(nKey, newCost);
      // 0-cost neighbors go to front (deque optimization for 0-1 BFS)
      if (stepCost === 0) {
        queue.unshift({ hexKey: nKey, cost: newCost });
      } else {
        queue.push({ hexKey: nKey, cost: newCost });
      }
    }
  }

  costs.delete(fromHexKey);
  return costs;
}

// Simple distance-based reachable (no team land bonus) for naval units
function computeReachableSimple(fromHexKey, speed) {
  const costs = new Map();
  costs.set(fromHexKey, 0);
  const queue = [{ hexKey: fromHexKey, cost: 0 }];

  while (queue.length > 0) {
    const { hexKey, cost } = queue.shift();
    if (cost > (costs.get(hexKey) ?? Infinity)) continue;
    const [q, r] = hexKey.split(',').map(Number);
    for (const dir of [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ]) {
      const nKey = `${q + dir.q},${r + dir.r}`;
      const newCost = cost + 1;
      if (newCost > speed) continue;
      if (newCost >= (costs.get(nKey) ?? Infinity)) continue;
      costs.set(nKey, newCost);
      queue.push({ hexKey: nKey, cost: newCost });
    }
  }

  costs.delete(fromHexKey);
  return costs;
}

// Cache for current selection's reachable hexes
let cachedReachable = null;

function onMoveModeHexClick(hexKey, element, shiftKey) {
  if (movePhase === 'select_destination') {
    executeMove(hexKey);
    return;
  }

  // Select object phase
  const movable = getMovableAtHex(hexKey);
  if (movable) {
    selectObjectToMove(hexKey, movable);
  } else {
    showNotification('Nothing to move here', 'error');
  }
}

function getMovableAtHex(hexKey) {
  // Check for hex objects (ship, army, fleet, etc.)
  const hexObj = GameState.hexObjects[hexKey];
  if (hexObj) {
    // Don't allow moving territory markers
    if (hexObj.type === 'castle-territory' || hexObj.type === 'town-territory') {
      // Fall through to check for players on this hex
    } else {
      const speed = MOVE_SPEED[hexObj.type];
      if (speed !== 0 && speed !== undefined) {
        return {
          type: hexObj.type,
          hexKey,
          isHexObject: true,
          data: hexObj,
          speed: speed
        };
      }
      // Immovable object — fall through to check for players/armies on same hex
    }
  }

  // Check for players at this hex
  const players = GameState.getPlayersAtHex(hexKey);
  if (players.length > 0) {
    const { teamId, playerId, player } = players[0];
    const speed = getPlayerMoveSpeed(getEffectiveGold(player));
    return {
      type: 'player',
      hexKey,
      teamId,
      playerId,
      player,
      isPlayer: true,
      speed: speed
    };
  }

  return null;
}

function selectObjectToMove(hexKey, movable) {
  selectedMoveObject = movable;
  movePhase = 'select_destination';

  // Naval units use flat distance; land units get free movement on team land
  const isNaval = movable.type === 'ship' || movable.type === 'fleet';
  if (isNaval) {
    cachedReachable = computeReachableSimple(hexKey, movable.speed);
  } else {
    const teamId = movable.isPlayer ? movable.teamId : movable.data?.teamId;
    cachedReachable = computeReachable(hexKey, movable.speed, teamId);
  }

  updateMoveHint();
  highlightSelectedObject(hexKey);
  showMoveRange(cachedReachable);
  showNotification(`Selected ${movable.type} to move (range: ${movable.speed} hexes)`);
}

function executeMove(destinationHexKey) {
  if (!selectedMoveObject) return;

  // Check if destination is the same as source
  if (destinationHexKey === selectedMoveObject.hexKey) {
    showNotification('Already at this location', 'error');
    clearMoveSelection();
    return;
  }

  // Check movement range using pathfinding (team land is free)
  if (!cachedReachable || !cachedReachable.has(destinationHexKey)) {
    showNotification(`Out of range!`, 'error');
    clearMoveSelection();
    return;
  }

  // Check if destination has a hex object
  const destObj = GameState.hexObjects[destinationHexKey];
  if (destObj && !selectedMoveObject.isPlayer) {
    showNotification('Destination is occupied', 'error');
    clearMoveSelection();
    return;
  }

  // Check if destination has a player (for non-player moves)
  const destPlayers = GameState.getPlayersAtHex(destinationHexKey);
  if (destPlayers.length > 0 && selectedMoveObject.isPlayer) {
    showNotification('Another player is already here', 'error');
    clearMoveSelection();
    return;
  }

  if (selectedMoveObject.isPlayer) {
    // Move player
    GameState.setPlayerPosition(
      selectedMoveObject.teamId,
      selectedMoveObject.playerId,
      destinationHexKey
    );
    showNotification(`${selectedMoveObject.player.name} moved`);
    renderPlayerMarkers();
  } else if (selectedMoveObject.isHexObject) {
    // Move hex object (preserving all properties including health)
    const obj = GameState.hexObjects[selectedMoveObject.hexKey];

    // Simple move for movable objects
    delete GameState.hexObjects[selectedMoveObject.hexKey];
    GameState.hexObjects[destinationHexKey] = obj;
    showNotification(`${selectedMoveObject.type} moved`);
    rerenderObjectType(obj.type);
  }

  // Update health bars to new positions
  renderAllHealthBars();

  clearMoveSelection();
}

function moveCastle(fromHex, toHex) {
  // Get all castle territory hexes
  const territoryHexes = [];
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'castle-territory' && obj.centerHex === fromHex) {
      territoryHexes.push(hexKey);
    }
  }

  // Calculate offset
  const [fromQ, fromR] = fromHex.split(',').map(Number);
  const [toQ, toR] = toHex.split(',').map(Number);
  const offsetQ = toQ - fromQ;
  const offsetR = toR - fromR;

  // Move castle center
  const castle = GameState.hexObjects[fromHex];
  delete GameState.hexObjects[fromHex];
  GameState.hexObjects[toHex] = castle;

  // Move territory hexes
  for (const oldHexKey of territoryHexes) {
    const [q, r] = oldHexKey.split(',').map(Number);
    const newHexKey = `${q + offsetQ},${r + offsetR}`;
    const territory = GameState.hexObjects[oldHexKey];
    territory.centerHex = toHex;
    delete GameState.hexObjects[oldHexKey];
    GameState.hexObjects[newHexKey] = territory;
  }

  showNotification('Castle moved');
  renderCastles();
}

function moveTown(fromHex, toHex) {
  // Get all town territory hexes
  const territoryHexes = [];
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'town-territory' && obj.centerHex === fromHex) {
      territoryHexes.push(hexKey);
    }
  }

  // Calculate offset
  const [fromQ, fromR] = fromHex.split(',').map(Number);
  const [toQ, toR] = toHex.split(',').map(Number);
  const offsetQ = toQ - fromQ;
  const offsetR = toR - fromR;

  // Move town center
  const town = GameState.hexObjects[fromHex];
  delete GameState.hexObjects[fromHex];
  GameState.hexObjects[toHex] = town;

  // Move territory hexes
  for (const oldHexKey of territoryHexes) {
    const [q, r] = oldHexKey.split(',').map(Number);
    const newHexKey = `${q + offsetQ},${r + offsetR}`;
    const territory = GameState.hexObjects[oldHexKey];
    territory.centerHex = toHex;
    delete GameState.hexObjects[oldHexKey];
    GameState.hexObjects[newHexKey] = territory;
  }

  showNotification('Town moved');
  renderTowns();
}

function rerenderObjectType(type) {
  switch (type) {
    case 'ship': renderShips(); break;
    case 'fleet': renderFleets(); break;
    case 'wagon': renderWagons(); break;
    case 'army': renderArmies(); break;
    case 'catapult': renderCatapults(); break;
    case 'bridge': renderBridges(); break;
    case 'castle': renderCastles(); break;
    case 'town': renderTowns(); break;
  }
}

function highlightSelectedObject(hexKey) {
  // Add visual highlight to the selected object
  const marker = document.querySelector(`[data-hex="${hexKey}"]`);
  if (marker) {
    marker.classList.add('move-selected');
  }

  // Also highlight any markers on this hex
  document.querySelectorAll(`.ship-marker[data-hex="${hexKey}"], .army-marker[data-hex="${hexKey}"], .town-marker[data-hex="${hexKey}"], .castle-marker[data-hex="${hexKey}"], .bridge-marker[data-hex="${hexKey}"], .player-marker`).forEach(m => {
    const playerHex = m.closest('[data-hex]')?.getAttribute('data-hex');
    if (m.getAttribute('data-hex') === hexKey || playerHex === hexKey) {
      m.classList.add('move-selected');
    }
  });
}

function showMoveRange(reachable) {
  clearMoveRange();
  // Highlight all hex polygons that are reachable
  document.querySelectorAll('.hex[data-hex]').forEach(hexEl => {
    const hexKey = hexEl.getAttribute('data-hex');
    if (reachable.has(hexKey)) {
      hexEl.classList.add('move-in-range');
    }
  });
}

function clearMoveRange() {
  document.querySelectorAll('.move-in-range').forEach(el => el.classList.remove('move-in-range'));
}
