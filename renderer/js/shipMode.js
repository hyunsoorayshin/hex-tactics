// ============================================
// Ship Mode Module
// ============================================

let shipMode = false;

// Ship interaction state
let shipInteractionMode = null; // 'boarding' | 'disembarking' | null
let selectedShipHex = null;

function isShipMode() {
  return shipMode;
}

function setShipMode(enabled) {
  shipMode = enabled;
  if (enabled) {
    showShipHint();
  } else {
    hideShipHint();
    clearShipInteraction();
  }
}

function toggleShipMode() {
  setShipMode(!shipMode);
  return shipMode;
}

function clearShipInteraction() {
  shipInteractionMode = null;
  selectedShipHex = null;
  updateShipHint();
}

function getShipInteractionMode() {
  return shipInteractionMode;
}

function getSelectedShipHex() {
  return selectedShipHex;
}

// ============================================
// Ship Hint UI
// ============================================

function showShipHint() {
  let hint = document.getElementById('ship-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'ship-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateShipHint();
  hint.classList.add('visible');
}

function hideShipHint() {
  const hint = document.getElementById('ship-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateShipHint() {
  const hint = document.getElementById('ship-hint');
  if (!hint) return;

  if (shipInteractionMode === 'boarding') {
    hint.textContent = 'Click a hex with a player to board them onto the ship';
    hint.classList.add('interaction');
  } else if (shipInteractionMode === 'disembarking') {
    hint.textContent = 'Click a hex to disembark the passenger';
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click to place. Shift+click to board/disembark. Cmd+click to remove.';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Ship Placement Logic
// ============================================

function onShipModeHexClick(hexKey, element, shiftKey, metaKey) {
  // If in interaction mode, handle boarding/disembarking
  if (shipInteractionMode === 'boarding') {
    handleBoarding(hexKey);
    return;
  }

  if (shipInteractionMode === 'disembarking') {
    handleDisembarking(hexKey);
    return;
  }

  const currentTeam = getCurrentTeam();
  const existingShip = GameState.hexObjects[hexKey];

  // Check if ship already exists here
  if (existingShip?.type === 'ship') {
    // Shift+click to enter interaction mode
    if (shiftKey) {
      enterShipInteraction(hexKey, existingShip);
    } else if (metaKey) {
      // Cmd+click to remove (only if no passenger)
      if (existingShip.passenger) {
        showNotification('Disembark passenger first!', 'error');
      } else {
        removeShip(hexKey);
        showNotification('Ship removed');
      }
    } else {
      showNotification('Shift+click to board/disembark. Cmd+click to remove.', 'error');
    }
  } else {
    // Place new ship (no land ownership check)
    placeShip(hexKey, currentTeam);
    showNotification('Ship placed!');
  }
}

function enterShipInteraction(hexKey, ship) {
  selectedShipHex = hexKey;

  if (ship.passenger) {
    // Ship has passenger - enter disembarking mode
    shipInteractionMode = 'disembarking';
    showNotification(`Select destination for ${ship.passenger.name}`);
  } else {
    // Ship is empty - enter boarding mode
    shipInteractionMode = 'boarding';
    showNotification('Select a player to board');
  }

  updateShipHint();
  renderShips(); // Re-render to show selected state
}

function handleBoarding(hexKey) {
  // Check if there's a player at this hex
  const playersAtHex = GameState.getPlayersAtHex(hexKey);

  if (playersAtHex.length === 0) {
    showNotification('No player at this hex', 'error');
    return;
  }

  // Get the first player (if multiple, take the first)
  const { teamId, playerId, player } = playersAtHex[0];
  const ship = GameState.hexObjects[selectedShipHex];

  if (!ship || ship.type !== 'ship') {
    showNotification('Ship not found', 'error');
    clearShipInteraction();
    return;
  }

  // Board the player onto the ship
  ship.passenger = {
    teamId: teamId,
    playerId: playerId,
    name: player.name
  };

  // Remove player from their hex position
  GameState.setPlayerPosition(teamId, playerId, null);

  showNotification(`${player.name} boarded the ship!`);
  clearShipInteraction();

  // Re-render
  renderShips();
  renderPlayerMarkers();
  renderAllHealthBars();
}

function handleDisembarking(hexKey) {
  const ship = GameState.hexObjects[selectedShipHex];

  if (!ship || ship.type !== 'ship' || !ship.passenger) {
    showNotification('No passenger to disembark', 'error');
    clearShipInteraction();
    return;
  }

  const { teamId, playerId, name } = ship.passenger;

  // Set player position to the clicked hex
  GameState.setPlayerPosition(teamId, playerId, hexKey);

  // Clear passenger from ship
  delete ship.passenger;

  showNotification(`${name} disembarked!`);
  clearShipInteraction();

  // Re-render
  renderShips();
  renderPlayerMarkers();
  renderAllHealthBars();
}

function placeShip(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'ship',
    teamId: teamId,
    health: OBJECT_HEALTH.ship,
    maxHealth: OBJECT_HEALTH.ship
  };

  console.log(`Placed ship for team ${teamId} at ${hexKey}`);
  renderShips();
}

function removeShip(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'ship') {
    delete GameState.hexObjects[hexKey];
    renderShips();
  }
}

// ============================================
// Ship Rendering
// ============================================

function renderShips() {
  // Remove existing ship markers
  document.querySelectorAll('.ship-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="ship-outline-"]').forEach(f => f.remove());

  // Find all ships
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'ship') {
      const isSelected = hexKey === selectedShipHex;
      addShipMarker(hexKey, obj.teamId, obj.passenger, isSelected);
    }
  }
}

function addShipMarker(hexKey, teamId, passenger, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.ship;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('ship-marker');
  if (isSelected) marker.classList.add('selected');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Click handler - delegate to appropriate mode
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    // Delegate to other modes if active
    if (isBattleMode()) {
      onBattleModeHexClick(hexKey, null, e.shiftKey);
      return;
    }
    if (isMoveMode()) {
      onMoveModeHexClick(hexKey, null, e.shiftKey);
      return;
    }

    // Ship mode handling
    if (isShipMode()) {
      if (shipInteractionMode) {
        // In interaction mode, treat as hex click
        onShipModeHexClick(hexKey, null, e.shiftKey, metaKey);
      } else if (e.shiftKey) {
        // Shift+click to interact
        const ship = GameState.hexObjects[hexKey];
        if (ship) enterShipInteraction(hexKey, ship);
      } else if (metaKey) {
        // Cmd+click to remove (if no passenger)
        const ship = GameState.hexObjects[hexKey];
        if (ship?.passenger) {
          showNotification('Disembark passenger first!', 'error');
        } else {
          removeShip(hexKey);
          showNotification('Ship removed');
        }
      } else {
        showNotification('Shift+click to board/disembark. Cmd+click to remove.', 'error');
      }
    }
  });

  // Create SVG filter for team color outline
  const filterId = `ship-outline-${hexKey.replace(',', '-')}`;
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

  // Dilate alpha for outline
  const morphology = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
  morphology.setAttribute('in', 'SourceAlpha');
  morphology.setAttribute('operator', 'dilate');
  morphology.setAttribute('radius', '2');
  morphology.setAttribute('result', 'dilated');

  // Fill with team color
  const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
  flood.setAttribute('flood-color', teamColor);
  flood.setAttribute('result', 'color');

  // Mask with dilated alpha
  const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
  composite.setAttribute('in', 'color');
  composite.setAttribute('in2', 'dilated');
  composite.setAttribute('operator', 'in');
  composite.setAttribute('result', 'outline');

  // Merge outline behind original
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

  // Ship image (centered)
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/ship.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('ship-marker-icon');

  marker.appendChild(icon);

  // Add passenger name label if ship has a passenger
  if (passenger) {
    const passengerTeam = GameState.teams[passenger.teamId];
    const passengerColor = passengerTeam?.border || '#ffffff';

    // Name background for readability
    const nameWidth = passenger.name.length * 7 + 8;
    const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nameBg.setAttribute('x', centerX - nameWidth / 2);
    nameBg.setAttribute('y', centerY - iconSize / 2 - 20);
    nameBg.setAttribute('width', nameWidth);
    nameBg.setAttribute('height', 14);
    nameBg.setAttribute('rx', 3);
    nameBg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    nameBg.setAttribute('stroke', passengerColor);
    nameBg.setAttribute('stroke-width', 1);

    // Passenger name text
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', centerX);
    nameText.setAttribute('y', centerY - iconSize / 2 - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('fill', '#fff');
    nameText.setAttribute('font-size', '11');
    nameText.setAttribute('font-weight', 'bold');
    nameText.classList.add('ship-passenger-name');
    nameText.textContent = passenger.name;

    marker.appendChild(nameBg);
    marker.appendChild(nameText);
  }

  // Add selected indicator
  if (isSelected) {
    const selectRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    selectRing.setAttribute('cx', centerX);
    selectRing.setAttribute('cy', centerY);
    selectRing.setAttribute('r', iconSize / 2 + 8);
    selectRing.setAttribute('fill', 'none');
    selectRing.setAttribute('stroke', '#ffff00');
    selectRing.setAttribute('stroke-width', 2);
    selectRing.setAttribute('stroke-dasharray', '5,3');
    selectRing.classList.add('ship-select-ring');
    marker.insertBefore(selectRing, marker.firstChild);
  }

  svg.appendChild(marker);
}
