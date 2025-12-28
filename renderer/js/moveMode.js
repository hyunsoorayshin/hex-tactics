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
  movePhase = moveMode ? 'select_object' : null;
  updateMoveHint();
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
    hint.textContent = `Click destination hex to move ${name}`;
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click an object or player to move';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Move Logic
// ============================================

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
  // Check for hex objects (ship, army, castle, town, bridge)
  const hexObj = GameState.hexObjects[hexKey];
  if (hexObj) {
    // Don't allow moving territory markers
    if (hexObj.type === 'castle-territory' || hexObj.type === 'town-territory') {
      return null;
    }
    return {
      type: hexObj.type,
      hexKey,
      isHexObject: true,
      data: hexObj
    };
  }

  // Check for players at this hex
  const players = GameState.getPlayersAtHex(hexKey);
  if (players.length > 0) {
    const { teamId, playerId, player } = players[0];
    return {
      type: 'player',
      hexKey,
      teamId,
      playerId,
      player,
      isPlayer: true
    };
  }

  return null;
}

function selectObjectToMove(hexKey, movable) {
  selectedMoveObject = movable;
  movePhase = 'select_destination';
  updateMoveHint();
  highlightSelectedObject(hexKey);
  showNotification(`Selected ${movable.type} to move`);
}

function executeMove(destinationHexKey) {
  if (!selectedMoveObject) return;

  // Check if destination is the same as source
  if (destinationHexKey === selectedMoveObject.hexKey) {
    showNotification('Already at this location', 'error');
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

    // Handle castle move - need to move territory too
    if (obj.type === 'castle') {
      moveCastle(selectedMoveObject.hexKey, destinationHexKey);
    } else if (obj.type === 'town') {
      moveTown(selectedMoveObject.hexKey, destinationHexKey);
    } else {
      // Simple move for other objects
      delete GameState.hexObjects[selectedMoveObject.hexKey];
      GameState.hexObjects[destinationHexKey] = obj;
      showNotification(`${selectedMoveObject.type} moved`);
      // Re-render the appropriate type
      rerenderObjectType(obj.type);
    }
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
    case 'army': renderArmies(); break;
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
