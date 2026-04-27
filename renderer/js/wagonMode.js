// ============================================
// Wagon Mode Module
// ============================================

let wagonMode = false;

// Wagon interaction state
let wagonInteractionMode = null; // 'boarding' | 'disembarking' | null
let selectedWagonHex = null;
let selectedWagonDisembarkIndex = null;

const WAGON_CAPACITY = 5;

function isWagonMode() {
  return wagonMode;
}

function setWagonMode(enabled) {
  wagonMode = enabled;
  if (enabled) {
    showWagonHint();
  } else {
    hideWagonHint();
    clearWagonInteraction();
  }
}

function toggleWagonMode() {
  setWagonMode(!wagonMode);
  return wagonMode;
}

function clearWagonInteraction() {
  wagonInteractionMode = null;
  selectedWagonHex = null;
  selectedWagonDisembarkIndex = null;
  closeWagonPassengerPanel();
  updateWagonHint();
  renderWagons();
}

function getWagonInteractionMode() {
  return wagonInteractionMode;
}

// ============================================
// Wagon Hint UI
// ============================================

function showWagonHint() {
  let hint = document.getElementById('wagon-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'wagon-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateWagonHint();
  hint.classList.add('visible');
}

function hideWagonHint() {
  const hint = document.getElementById('wagon-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateWagonHint() {
  const hint = document.getElementById('wagon-hint');
  if (!hint) return;

  if (wagonInteractionMode === 'boarding') {
    hint.textContent = 'Click a hex with a player or army to board onto the wagon';
    hint.classList.add('interaction');
  } else if (wagonInteractionMode === 'disembarking') {
    hint.textContent = 'Click a hex to place the passenger';
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click to place. Shift: board | Option: disembark | Cmd: remove';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Wagon Placement Logic
// ============================================

function onWagonModeHexClick(hexKey, element, shiftKey, metaKey, altKey) {
  if (wagonInteractionMode === 'boarding') {
    handleWagonBoarding(hexKey);
    return;
  }

  if (wagonInteractionMode === 'disembarking') {
    handleWagonDisembarking(hexKey);
    return;
  }

  const currentTeam = getCurrentTeam();
  const existingWagon = GameState.hexObjects[hexKey];

  if (existingWagon?.type === 'wagon') {
    if (shiftKey) {
      const passengers = existingWagon.passengers || [];
      if (passengers.length >= WAGON_CAPACITY) {
        showNotification(`Wagon is full (${WAGON_CAPACITY}/${WAGON_CAPACITY})!`, 'error');
      } else {
        selectedWagonHex = hexKey;
        wagonInteractionMode = 'boarding';
        showNotification(`Select a player or army to board (${passengers.length}/${WAGON_CAPACITY})`);
        updateWagonHint();
        renderWagons();
      }
    } else if (altKey) {
      const passengers = existingWagon.passengers || [];
      if (passengers.length === 0) {
        showNotification('No passengers to disembark', 'error');
      } else {
        selectedWagonHex = hexKey;
        showWagonPassengerPanel(hexKey, passengers);
        renderWagons();
      }
    } else if (metaKey) {
      const passengers = existingWagon.passengers || [];
      if (passengers.length > 0) {
        showNotification('Disembark all passengers first!', 'error');
      } else {
        removeWagon(hexKey);
        showNotification('Wagon removed');
      }
    } else {
      showNotification('Shift: board | Option: disembark | Cmd: remove', 'error');
    }
  } else {
    if (isWaterHex(hexKey)) {
      showNotification('Cannot place wagon on water', 'error');
      return;
    }
    placeWagon(hexKey, currentTeam);
    showNotification('Wagon placed!');
  }
}

function handleWagonBoarding(hexKey) {
  const wagon = GameState.hexObjects[selectedWagonHex];
  if (!wagon || wagon.type !== 'wagon') {
    showNotification('Wagon not found', 'error');
    clearWagonInteraction();
    return;
  }

  if (!wagon.passengers) wagon.passengers = [];

  if (wagon.passengers.length >= WAGON_CAPACITY) {
    showNotification(`Wagon is full (${WAGON_CAPACITY}/${WAGON_CAPACITY})!`, 'error');
    clearWagonInteraction();
    return;
  }

  // Check for player at hex
  const playersAtHex = GameState.getPlayersAtHex(hexKey);
  if (playersAtHex.length > 0) {
    const { teamId, playerId, player } = playersAtHex[0];
    wagon.passengers.push({
      kind: 'player',
      teamId: teamId,
      playerId: playerId,
      name: player.name
    });
    GameState.setPlayerPosition(teamId, playerId, null);
    showNotification(`${player.name} boarded the wagon! (${wagon.passengers.length}/${WAGON_CAPACITY})`);

    if (wagon.passengers.length < WAGON_CAPACITY) {
      updateWagonHint();
    } else {
      clearWagonInteraction();
    }

    renderWagons();
    renderPlayerMarkers();
    renderAllHealthBars();
    return;
  }

  // Check for army at hex
  const hexObj = GameState.hexObjects[hexKey];
  if (hexObj?.type === 'army') {
    wagon.passengers.push({
      kind: 'army',
      teamId: hexObj.teamId,
      sourceHex: hexKey
    });
    delete GameState.hexObjects[hexKey];
    showNotification(`Army boarded the wagon! (${wagon.passengers.length}/${WAGON_CAPACITY})`);

    if (wagon.passengers.length < WAGON_CAPACITY) {
      updateWagonHint();
    } else {
      clearWagonInteraction();
    }

    renderWagons();
    renderArmies();
    renderAllHealthBars();
    return;
  }

  showNotification('No player or army at this hex', 'error');
}

function handleWagonDisembarking(hexKey) {
  const wagon = GameState.hexObjects[selectedWagonHex];
  if (!wagon || wagon.type !== 'wagon' || !wagon.passengers || wagon.passengers.length === 0) {
    showNotification('No passengers to disembark', 'error');
    clearWagonInteraction();
    return;
  }

  if (selectedWagonDisembarkIndex === null) {
    showNotification('Select a passenger from the panel first', 'error');
    return;
  }

  const passenger = wagon.passengers.splice(selectedWagonDisembarkIndex, 1)[0];

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

  clearWagonInteraction();

  renderWagons();
  renderPlayerMarkers();
  renderArmies();
  renderAllHealthBars();
}

function placeWagon(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'wagon',
    teamId: teamId,
    health: OBJECT_HEALTH.wagon,
    maxHealth: OBJECT_HEALTH.wagon,
    passengers: []
  };
  renderWagons();
}

function removeWagon(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'wagon') {
    delete GameState.hexObjects[hexKey];
    renderWagons();
  }
}

// ============================================
// Wagon Rendering
// ============================================

function renderWagons() {
  document.querySelectorAll('.wagon-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="wagon-outline-"]').forEach(f => f.remove());

  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'wagon') {
      const isSelected = hexKey === selectedWagonHex;
      addWagonMarker(hexKey, obj.teamId, obj.passengers || [], isSelected);
    }
  }
}

function addWagonMarker(hexKey, teamId, passengers, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.wagon;

  const svg = document.getElementById('hex-overlay');

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('wagon-marker');
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

    if (isWagonMode()) {
      onWagonModeHexClick(hexKey, null, e.shiftKey, metaKey, e.altKey);
    }
  });

  // SVG filter for team color outline
  const filterId = `wagon-outline-${hexKey.replace(',', '-')}`;
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

  // Wagon icon
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/wagon.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('wagon-marker-icon');

  marker.appendChild(icon);

  // Passenger count badge (bottom-right)
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
    nameText.classList.add('wagon-passenger-names');
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
    selectRing.classList.add('wagon-select-ring');
    marker.insertBefore(selectRing, marker.firstChild);
  }

  svg.appendChild(marker);
}

// ============================================
// Wagon Passenger Selection Panel
// ============================================

function showWagonPassengerPanel(hexKey, passengers) {
  closeWagonPassengerPanel();

  const panel = document.createElement('div');
  panel.id = 'wagon-passenger-panel';
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
      selectedWagonDisembarkIndex = index;
      selectedWagonHex = hexKey;
      wagonInteractionMode = 'disembarking';
      closeWagonPassengerPanel();
      showNotification(`Click a hex to place ${label}`);
      updateWagonHint();
      renderWagons();
    });

    list.appendChild(item);
  });

  panel.appendChild(list);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fleet-passenger-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    clearWagonInteraction();
  });
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
}

function closeWagonPassengerPanel() {
  const panel = document.getElementById('wagon-passenger-panel');
  if (panel) panel.remove();
}
