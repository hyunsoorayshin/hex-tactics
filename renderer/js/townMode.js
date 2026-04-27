// ============================================
// Town Mode Module
// ============================================

let townMode = false;

// Town interaction state
let townInteractionMode = null; // 'boarding' | 'disembarking' | null
let selectedTownHex = null;
let selectedTownDisembarkIndex = null;

const TOWN_CAPACITY = 3;

function isTownMode() {
  return townMode;
}

function setTownMode(enabled) {
  townMode = enabled;
  if (enabled) {
    showTownHint();
  } else {
    hideTownHint();
    clearTownInteraction();
  }
}

function toggleTownMode() {
  setTownMode(!townMode);
  return townMode;
}

function getTownInteractionMode() {
  return townInteractionMode;
}

function clearTownInteraction() {
  townInteractionMode = null;
  selectedTownHex = null;
  selectedTownDisembarkIndex = null;
  closeTownPassengerPanel();
  updateTownHint();
  renderTowns();
}

// ============================================
// Town Hint UI
// ============================================

function showTownHint() {
  let hint = document.getElementById('town-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'town-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateTownHint();
  hint.classList.add('visible');
}

function hideTownHint() {
  const hint = document.getElementById('town-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateTownHint() {
  const hint = document.getElementById('town-hint');
  if (!hint) return;

  if (townInteractionMode === 'boarding') {
    hint.textContent = 'Click a hex with a player to board into the town';
    hint.classList.add('interaction');
  } else if (townInteractionMode === 'disembarking') {
    hint.textContent = 'Click a hex to place the passenger';
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click to place. Shift: board | Option: disembark | Cmd: remove';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Town Placement Logic
// ============================================

function canPlaceTown(hexKey, teamId) {
  // Get center hex and all 6 neighbors
  const hexes = getHexAndNeighbors(hexKey);

  // Check if all 7 hexes are owned by this team
  for (const hex of hexes) {
    const key = hex.toString();
    if (GameState.land[key] !== teamId) {
      return { valid: false, reason: 'All 7 hexes must be your land' };
    }
  }

  // Check if any of these hexes already have a town or castle
  for (const hex of hexes) {
    const key = hex.toString();
    const obj = GameState.hexObjects[key];
    if (obj && (obj.type === 'town' || obj.type === 'town-territory' ||
                obj.type === 'castle' || obj.type === 'castle-territory')) {
      return { valid: false, reason: 'Cannot overlap with existing town or castle' };
    }
  }

  return { valid: true };
}

function onTownModeHexClick(hexKey, element, shiftKey, metaKey, altKey) {
  if (townInteractionMode === 'boarding') {
    handleTownBoarding(hexKey);
    return;
  }

  if (townInteractionMode === 'disembarking') {
    handleTownDisembarking(hexKey);
    return;
  }

  const currentTeam = getCurrentTeam();

  // Check if clicking on existing town
  const existingObj = GameState.hexObjects[hexKey];
  if (existingObj?.type === 'town' || existingObj?.type === 'town-territory') {
    const centerHex = existingObj.type === 'town' ? hexKey : existingObj.centerHex;
    const town = GameState.hexObjects[centerHex];

    if (shiftKey) {
      const passengers = town.passengers || [];
      if (passengers.length >= TOWN_CAPACITY) {
        showNotification(`Town is full (${TOWN_CAPACITY}/${TOWN_CAPACITY})!`, 'error');
      } else {
        selectedTownHex = centerHex;
        townInteractionMode = 'boarding';
        showNotification(`Select a player to board (${passengers.length}/${TOWN_CAPACITY})`);
        updateTownHint();
        renderTowns();
      }
    } else if (altKey) {
      const passengers = town.passengers || [];
      if (passengers.length === 0) {
        showNotification('No passengers to disembark', 'error');
      } else {
        selectedTownHex = centerHex;
        showTownPassengerPanel(centerHex, passengers);
        renderTowns();
      }
    } else if (metaKey) {
      const passengers = town.passengers || [];
      if (passengers.length > 0) {
        showNotification('Disembark all passengers first!', 'error');
      } else {
        removeTown(centerHex);
        showNotification('Town removed');
      }
    } else {
      showNotification('Shift: board | Option: disembark | Cmd: remove', 'error');
    }
    return;
  }

  // Try to place new town
  const result = canPlaceTown(hexKey, currentTeam);
  if (!result.valid) {
    showNotification(result.reason, 'error');
    return;
  }

  placeTown(hexKey, currentTeam);
  showNotification('Town placed!');
}

// ============================================
// Town Boarding / Disembarking
// ============================================

function handleTownBoarding(hexKey) {
  const town = GameState.hexObjects[selectedTownHex];
  if (!town || town.type !== 'town') {
    showNotification('Town not found', 'error');
    clearTownInteraction();
    return;
  }

  if (!town.passengers) town.passengers = [];

  if (town.passengers.length >= TOWN_CAPACITY) {
    showNotification(`Town is full (${TOWN_CAPACITY}/${TOWN_CAPACITY})!`, 'error');
    clearTownInteraction();
    return;
  }

  // Check for player at hex (town only accepts players, not armies)
  const playersAtHex = GameState.getPlayersAtHex(hexKey);
  if (playersAtHex.length > 0) {
    const { teamId, playerId, player } = playersAtHex[0];
    town.passengers.push({
      kind: 'player',
      teamId: teamId,
      playerId: playerId,
      name: player.name
    });

    // Remove player from their hex position
    GameState.setPlayerPosition(teamId, playerId, null);

    // Heal player to full health
    const stats = getPlayerStats(getEffectiveGold(player));
    player.health = stats.health;
    player.maxHealth = stats.health;

    // Revive dead players
    if (player.isDead) {
      player.isDead = false;
      player.revives = (player.revives || 0) + 1;
      const team = GameState.teams[teamId];
      if (team) {
        team.reviveCount = (team.reviveCount || 0) + 1;
      }
      showNotification(`${player.name} revived and boarded the town! (-${REVIVE_COST}g, ${town.passengers.length}/${TOWN_CAPACITY})`);
    } else {
      showNotification(`${player.name} boarded the town (healed to full)! (${town.passengers.length}/${TOWN_CAPACITY})`);
    }

    if (town.passengers.length < TOWN_CAPACITY) {
      updateTownHint();
    } else {
      clearTownInteraction();
    }

    renderTowns();
    renderPlayerMarkers();
    renderAllHealthBars();
    return;
  }

  showNotification('No player at this hex', 'error');
}

function handleTownDisembarking(hexKey) {
  const town = GameState.hexObjects[selectedTownHex];
  if (!town || town.type !== 'town' || !town.passengers || town.passengers.length === 0) {
    showNotification('No passengers to disembark', 'error');
    clearTownInteraction();
    return;
  }

  if (selectedTownDisembarkIndex === null) {
    showNotification('Select a passenger from the panel first', 'error');
    return;
  }

  const passenger = town.passengers.splice(selectedTownDisembarkIndex, 1)[0];

  GameState.setPlayerPosition(passenger.teamId, passenger.playerId, hexKey);
  showNotification(`${passenger.name} disembarked!`);

  clearTownInteraction();

  renderTowns();
  renderPlayerMarkers();
  renderAllHealthBars();
}

function evictFromTown(hexKey) {
  const town = GameState.hexObjects[hexKey];
  if (!town?.passengers || town.passengers.length === 0) return;

  for (const passenger of town.passengers) {
    GameState.setPlayerPosition(passenger.teamId, passenger.playerId, null);
  }
  town.passengers = [];
}

function placeTown(hexKey, teamId) {
  // Store town in game state (center hex)
  GameState.hexObjects[hexKey] = {
    type: 'town',
    teamId: teamId,
    health: OBJECT_HEALTH.town,
    maxHealth: OBJECT_HEALTH.town,
    passengers: []
  };

  // Mark all 6 neighbor hexes as town territory
  const hexes = getHexAndNeighbors(hexKey);
  for (const hex of hexes) {
    const key = hex.toString();
    if (key !== hexKey) {
      GameState.hexObjects[key] = {
        type: 'town-territory',
        teamId: teamId,
        centerHex: hexKey
      };
    }
  }

  console.log(`Placed town for team ${teamId} at ${hexKey}`);
  renderTowns();
}

function removeTown(hexKey) {
  const obj = GameState.hexObjects[hexKey];
  if (!obj) return;

  // If this is the center, remove the town and all territory
  if (obj.type === 'town') {
    // Evict all passengers first
    evictFromTown(hexKey);
    const hexes = getHexAndNeighbors(hexKey);
    for (const hex of hexes) {
      delete GameState.hexObjects[hex.toString()];
    }
  }
  // If this is territory, find and remove the whole town
  else if (obj.type === 'town-territory') {
    removeTown(obj.centerHex);
    return;
  }

  renderTowns();
}

// ============================================
// Town Passenger Selection Panel
// ============================================

function showTownPassengerPanel(hexKey, passengers) {
  closeTownPassengerPanel();

  const panel = document.createElement('div');
  panel.id = 'town-passenger-panel';
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

    const icon = '\u2694';
    const label = p.name;
    item.textContent = `${icon} ${label}`;

    item.addEventListener('click', () => {
      selectedTownDisembarkIndex = index;
      selectedTownHex = hexKey;
      townInteractionMode = 'disembarking';
      closeTownPassengerPanel();
      showNotification(`Click a hex to place ${label}`);
      updateTownHint();
      renderTowns();
    });

    list.appendChild(item);
  });

  panel.appendChild(list);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fleet-passenger-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    clearTownInteraction();
  });
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
}

function closeTownPassengerPanel() {
  const panel = document.getElementById('town-passenger-panel');
  if (panel) panel.remove();
}

// ============================================
// Town Rendering
// ============================================

function renderTowns() {
  // Remove existing town markers
  document.querySelectorAll('.town-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="town-outline-"]').forEach(f => f.remove());

  // Find all towns (center hexes only)
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'town') {
      const isSelected = hexKey === selectedTownHex;
      addTownMarker(hexKey, obj.teamId, obj.passengers || [], isSelected);
    }
  }
}

function addTownMarker(hexKey, teamId, passengers, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.town;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('town-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Click handler - delegate to appropriate mode
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    if (isLandMode()) {
      onLandClick(hexKey, document.querySelector(`.hex[data-hex="${hexKey}"]`));
      return;
    }
    if (townInteractionMode === 'boarding') {
      handleTownBoarding(hexKey);
      return;
    }
    if (townInteractionMode === 'disembarking') {
      handleTownDisembarking(hexKey);
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
    if (isCastleMode()) {
      onCastleModeHexClick(hexKey, null, e.shiftKey, metaKey, e.altKey);
      return;
    }
    if (isPlayerMode()) {
      onPlayerModeHexClick(hexKey, null);
      return;
    }
    if (isTownMode()) {
      onTownModeHexClick(hexKey, null, e.shiftKey, metaKey, e.altKey);
    }
  });

  // Create SVG filter for team color outline
  const filterId = `town-outline-${hexKey.replace(',', '-')}`;
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
  morphology.setAttribute('radius', '1');
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

  // Town image (centered)
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/town.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('town-marker-icon');

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
    const names = passengers.map(p => p.name).join(', ');
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
    nameText.classList.add('town-passenger-names');
    nameText.textContent = displayText;

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
    selectRing.classList.add('town-select-ring');
    marker.insertBefore(selectRing, marker.firstChild);
  }

  svg.appendChild(marker);
}
