// ============================================
// Fleet Mode Module
// ============================================

let fleetMode = false;

// Fleet interaction state
let fleetInteractionMode = null; // 'boarding' | 'disembarking' | null
let selectedFleetHex = null;
let selectedDisembarkIndex = null; // index of passenger to disembark

function isFleetMode() {
  return fleetMode;
}

function setFleetMode(enabled) {
  fleetMode = enabled;
  if (enabled) {
    showFleetHint();
  } else {
    hideFleetHint();
    clearFleetInteraction();
  }
}

function toggleFleetMode() {
  setFleetMode(!fleetMode);
  return fleetMode;
}

function clearFleetInteraction() {
  fleetInteractionMode = null;
  selectedFleetHex = null;
  selectedDisembarkIndex = null;
  closeFleetPassengerPanel();
  updateFleetHint();
}

function getFleetInteractionMode() {
  return fleetInteractionMode;
}

// ============================================
// Fleet Hint UI
// ============================================

function showFleetHint() {
  let hint = document.getElementById('fleet-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'fleet-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateFleetHint();
  hint.classList.add('visible');
}

function hideFleetHint() {
  const hint = document.getElementById('fleet-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateFleetHint() {
  const hint = document.getElementById('fleet-hint');
  if (!hint) return;

  if (fleetInteractionMode === 'boarding') {
    hint.textContent = 'Click a hex with a player or army to board onto the fleet';
    hint.classList.add('interaction');
  } else if (fleetInteractionMode === 'disembarking') {
    hint.textContent = 'Click a passenger to disembark, or click a hex to disembark all';
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click to place. Shift: board | Option: disembark | Cmd: remove';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Fleet Placement Logic
// ============================================

function onFleetModeHexClick(hexKey, element, shiftKey, metaKey, altKey) {
  if (fleetInteractionMode === 'boarding') {
    handleFleetBoarding(hexKey);
    return;
  }

  if (fleetInteractionMode === 'disembarking') {
    handleFleetDisembarking(hexKey);
    return;
  }

  const currentTeam = getCurrentTeam();
  const existingFleet = GameState.hexObjects[hexKey];

  if (existingFleet?.type === 'fleet') {
    if (shiftKey) {
      // Shift+click to board
      const passengers = existingFleet.passengers || [];
      if (passengers.length >= 10) {
        showNotification('Fleet is full (10/10)!', 'error');
      } else {
        selectedFleetHex = hexKey;
        fleetInteractionMode = 'boarding';
        showNotification(`Select a player or army to board (${passengers.length}/10)`);
        updateFleetHint();
        renderFleets();
      }
    } else if (altKey) {
      // Option+click to disembark — show passenger picker
      const passengers = existingFleet.passengers || [];
      if (passengers.length === 0) {
        showNotification('No passengers to disembark', 'error');
      } else {
        selectedFleetHex = hexKey;
        showFleetPassengerPanel(hexKey, passengers);
        renderFleets();
      }
    } else if (metaKey) {
      const passengers = existingFleet.passengers || [];
      if (passengers.length > 0) {
        showNotification('Disembark all passengers first!', 'error');
      } else {
        removeFleet(hexKey);
        showNotification('Fleet removed');
      }
    } else {
      showNotification('Shift: board | Option: disembark | Cmd: remove', 'error');
    }
  } else {
    placeFleet(hexKey, currentTeam);
    showNotification('Fleet placed!');
  }
}

function handleFleetBoarding(hexKey) {
  const fleet = GameState.hexObjects[selectedFleetHex];
  if (!fleet || fleet.type !== 'fleet') {
    showNotification('Fleet not found', 'error');
    clearFleetInteraction();
    return;
  }

  if (!fleet.passengers) fleet.passengers = [];

  if (fleet.passengers.length >= 10) {
    showNotification('Fleet is full (10/10)!', 'error');
    clearFleetInteraction();
    return;
  }

  // Check for player at hex
  const playersAtHex = GameState.getPlayersAtHex(hexKey);
  if (playersAtHex.length > 0) {
    const { teamId, playerId, player } = playersAtHex[0];
    fleet.passengers.push({
      kind: 'player',
      teamId: teamId,
      playerId: playerId,
      name: player.name
    });
    GameState.setPlayerPosition(teamId, playerId, null);
    showNotification(`${player.name} boarded the fleet! (${fleet.passengers.length}/10)`);

    // Stay in boarding mode if not full
    if (fleet.passengers.length < 10) {
      updateFleetHint();
    } else {
      clearFleetInteraction();
    }

    renderFleets();
    renderPlayerMarkers();
    renderAllHealthBars();
    return;
  }

  // Check for army at hex
  const hexObj = GameState.hexObjects[hexKey];
  if (hexObj?.type === 'army') {
    fleet.passengers.push({
      kind: 'army',
      teamId: hexObj.teamId,
      sourceHex: hexKey
    });
    delete GameState.hexObjects[hexKey];
    showNotification(`Army boarded the fleet! (${fleet.passengers.length}/10)`);

    if (fleet.passengers.length < 10) {
      updateFleetHint();
    } else {
      clearFleetInteraction();
    }

    renderFleets();
    renderArmies();
    renderAllHealthBars();
    return;
  }

  showNotification('No player or army at this hex', 'error');
}

function handleFleetDisembarking(hexKey) {
  const fleet = GameState.hexObjects[selectedFleetHex];
  if (!fleet || fleet.type !== 'fleet' || !fleet.passengers || fleet.passengers.length === 0) {
    showNotification('No passengers to disembark', 'error');
    clearFleetInteraction();
    return;
  }

  if (selectedDisembarkIndex === null) {
    showNotification('Select a passenger from the panel first', 'error');
    return;
  }

  // Remove the selected passenger
  const passenger = fleet.passengers.splice(selectedDisembarkIndex, 1)[0];

  if (passenger.kind === 'player') {
    GameState.setPlayerPosition(passenger.teamId, passenger.playerId, hexKey);
    showNotification(`${passenger.name} disembarked!`);
  } else if (passenger.kind === 'army') {
    GameState.hexObjects[hexKey] = {
      type: 'army',
      teamId: passenger.teamId,
      health: OBJECT_HEALTH.army,
      maxHealth: OBJECT_HEALTH.army
    };
    showNotification('Army disembarked!');
  }

  clearFleetInteraction();

  renderFleets();
  renderPlayerMarkers();
  renderArmies();
  renderAllHealthBars();
}

function placeFleet(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'fleet',
    teamId: teamId,
    health: OBJECT_HEALTH.fleet,
    maxHealth: OBJECT_HEALTH.fleet,
    passengers: []
  };
  renderFleets();
}

function removeFleet(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'fleet') {
    delete GameState.hexObjects[hexKey];
    renderFleets();
  }
}

// ============================================
// Fleet Rendering
// ============================================

function renderFleets() {
  document.querySelectorAll('.fleet-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="fleet-outline-"]').forEach(f => f.remove());

  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'fleet') {
      const isSelected = hexKey === selectedFleetHex;
      addFleetMarker(hexKey, obj.teamId, obj.passengers || [], isSelected);
    }
  }
}

function addFleetMarker(hexKey, teamId, passengers, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.fleet;

  const svg = document.getElementById('hex-overlay');

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('fleet-marker');
  if (isSelected) marker.classList.add('selected');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    if (isLandMode()) {
      onLandClick(hexKey, document.querySelector(`.hex[data-hex="${hexKey}"]`));
      return;
    }

    if (isBattleMode()) {
      onBattleModeHexClick(hexKey, null, e.shiftKey);
      return;
    }
    if (isMoveMode()) {
      onMoveModeHexClick(hexKey, null, e.shiftKey);
      return;
    }

    if (isFleetMode()) {
      onFleetModeHexClick(hexKey, null, e.shiftKey, metaKey, e.altKey);
    }
  });

  // SVG filter for team color outline
  const filterId = `fleet-outline-${hexKey.replace(',', '-')}`;
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

  const morphology = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
  morphology.setAttribute('in', 'SourceAlpha');
  morphology.setAttribute('operator', 'dilate');
  morphology.setAttribute('radius', '1');
  morphology.setAttribute('result', 'dilated');

  const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
  flood.setAttribute('flood-color', teamColor);
  flood.setAttribute('result', 'color');

  const composite = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
  composite.setAttribute('in', 'color');
  composite.setAttribute('in2', 'dilated');
  composite.setAttribute('operator', 'in');
  composite.setAttribute('result', 'outline');

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

  // Fleet icon
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/fleet.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('fleet-marker-icon');

  marker.appendChild(icon);

  // Passenger count label
  const count = passengers.length;
  if (count > 0) {
    const badgeX = centerX + iconSize / 2 - 6;
    const badgeY = centerY + iconSize / 2 + 2;

    const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeBg.setAttribute('x', badgeX - 6);
    badgeBg.setAttribute('y', badgeY - 10);
    badgeBg.setAttribute('width', 16);
    badgeBg.setAttribute('height', 14);
    badgeBg.setAttribute('rx', 3);
    badgeBg.setAttribute('fill', 'rgba(0, 0, 0, 0.85)');
    badgeBg.setAttribute('stroke', teamColor);
    badgeBg.setAttribute('stroke-width', 1);

    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', badgeX + 2);
    badgeText.setAttribute('y', badgeY);
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.setAttribute('fill', '#fff');
    badgeText.setAttribute('font-size', '10');
    badgeText.setAttribute('font-weight', 'bold');
    badgeText.textContent = count;

    marker.appendChild(badgeBg);
    marker.appendChild(badgeText);
  }

  // Passenger names label
  if (count > 0) {
    const names = passengers.map(p => p.kind === 'player' ? p.name : 'Army').join(', ');
    const displayText = names.length > 30 ? names.substring(0, 27) + '...' : names;
    const nameWidth = displayText.length * 6 + 8;

    const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nameBg.setAttribute('x', centerX - nameWidth / 2);
    nameBg.setAttribute('y', centerY - iconSize / 2 - 20);
    nameBg.setAttribute('width', nameWidth);
    nameBg.setAttribute('height', 14);
    nameBg.setAttribute('rx', 3);
    nameBg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    nameBg.setAttribute('stroke', teamColor);
    nameBg.setAttribute('stroke-width', 1);

    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', centerX);
    nameText.setAttribute('y', centerY - iconSize / 2 - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('fill', '#fff');
    nameText.setAttribute('font-size', '10');
    nameText.classList.add('fleet-passenger-names');
    nameText.textContent = displayText;

    marker.appendChild(nameBg);
    marker.appendChild(nameText);
  }

  // Selected indicator
  if (isSelected) {
    const selectRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    selectRing.setAttribute('cx', centerX);
    selectRing.setAttribute('cy', centerY);
    selectRing.setAttribute('r', iconSize / 2 + 8);
    selectRing.setAttribute('fill', 'none');
    selectRing.setAttribute('stroke', '#ffff00');
    selectRing.setAttribute('stroke-width', 2);
    selectRing.setAttribute('stroke-dasharray', '5,3');
    selectRing.classList.add('fleet-select-ring');
    marker.insertBefore(selectRing, marker.firstChild);
  }

  svg.appendChild(marker);
}

// ============================================
// Fleet Passenger Selection Panel
// ============================================

function showFleetPassengerPanel(hexKey, passengers) {
  closeFleetPassengerPanel();

  const panel = document.createElement('div');
  panel.id = 'fleet-passenger-panel';
  panel.className = 'fleet-passenger-panel';

  const title = document.createElement('div');
  title.className = 'fleet-passenger-title';
  title.textContent = `Disembark (${passengers.length} aboard)`;
  panel.appendChild(title);

  const list = document.createElement('div');
  list.className = 'fleet-passenger-list';

  passengers.forEach((p, index) => {
    const item = document.createElement('button');
    item.className = 'fleet-passenger-item';

    const icon = p.kind === 'player' ? '\u2694' : '\u2655';
    const label = p.kind === 'player' ? p.name : 'Army';
    item.textContent = `${icon} ${label}`;

    item.addEventListener('click', () => {
      selectedDisembarkIndex = index;
      selectedFleetHex = hexKey;
      fleetInteractionMode = 'disembarking';
      closeFleetPassengerPanel();
      showNotification(`Click a hex to place ${label}`);
      updateFleetHint();
      renderFleets();
    });

    list.appendChild(item);
  });

  panel.appendChild(list);

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fleet-passenger-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    clearFleetInteraction();
  });
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
}

function closeFleetPassengerPanel() {
  const panel = document.getElementById('fleet-passenger-panel');
  if (panel) panel.remove();
}
