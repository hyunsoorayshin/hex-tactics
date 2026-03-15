// ============================================
// Town Mode Module
// ============================================

let townMode = false;

// Housing interaction state
let townHousingMode = null; // 'housing' | 'evicting' | null
let selectedTownHex = null;

function isTownMode() {
  return townMode;
}

function setTownMode(enabled) {
  townMode = enabled;
  if (enabled) {
    showTownHint();
  } else {
    hideTownHint();
    clearTownHousing();
  }
}

function toggleTownMode() {
  setTownMode(!townMode);
  return townMode;
}

function getTownHousingMode() {
  return townHousingMode;
}

function clearTownHousing() {
  townHousingMode = null;
  selectedTownHex = null;
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
    hint.textContent = 'Click to place town (7 hexes required). Cmd+click to remove.';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideTownHint() {
  const hint = document.getElementById('town-hint');
  if (hint) {
    hint.classList.remove('visible');
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

function onTownModeHexClick(hexKey, element, metaKey) {
  const currentTeam = getCurrentTeam();

  // Check if clicking on existing town
  const existingObj = GameState.hexObjects[hexKey];
  if (existingObj?.type === 'town' || existingObj?.type === 'town-territory') {
    // Cmd+click to remove
    if (metaKey) {
      const centerHex = existingObj.type === 'town' ? hexKey : existingObj.centerHex;
      removeTown(centerHex);
      showNotification('Town removed');
    } else {
      showNotification('Cmd+click to remove town', 'error');
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

function placeTown(hexKey, teamId) {
  // Store town in game state (center hex)
  GameState.hexObjects[hexKey] = {
    type: 'town',
    teamId: teamId,
    health: OBJECT_HEALTH.town,
    maxHealth: OBJECT_HEALTH.town
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
    // Evict any housed player first
    if (obj.housed) {
      evictFromTown(hexKey);
    }
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
// Town Housing System
// ============================================

function enterTownHousing(hexKey, town) {
  selectedTownHex = hexKey;

  if (town.housed) {
    // Town has resident - enter evicting mode
    townHousingMode = 'evicting';
    showNotification(`Click a hex to move ${town.housed.name} out`);
  } else {
    // Town is empty - enter housing mode
    townHousingMode = 'housing';
    showNotification('Click a player to house them');
  }

  renderTowns();
}

function handleTownHousing(hexKey) {
  // Check if there's a player at this hex
  const playersAtHex = GameState.getPlayersAtHex(hexKey);

  if (playersAtHex.length === 0) {
    showNotification('No player at this hex', 'error');
    return;
  }

  const { teamId, playerId, player } = playersAtHex[0];
  const town = GameState.hexObjects[selectedTownHex];

  if (!town || town.type !== 'town') {
    showNotification('Town not found', 'error');
    clearTownHousing();
    return;
  }

  // House the player in the town
  town.housed = {
    teamId: teamId,
    playerId: playerId,
    name: player.name
  };

  // Remove player from their hex position
  GameState.setPlayerPosition(teamId, playerId, null);

  // Heal player to full health
  const stats = getPlayerStats(getEffectiveGold(player));
  player.health = stats.health;
  player.maxHealth = stats.health;

  showNotification(`${player.name} is now housed in town (healed to full)!`);
  clearTownHousing();

  // Re-render
  renderTowns();
  renderPlayerMarkers();
  renderAllHealthBars();
}

function handleTownEvicting(hexKey) {
  const town = GameState.hexObjects[selectedTownHex];

  if (!town || town.type !== 'town' || !town.housed) {
    showNotification('No resident to evict', 'error');
    clearTownHousing();
    return;
  }

  const { teamId, playerId, name } = town.housed;

  // Set player position to the clicked hex
  GameState.setPlayerPosition(teamId, playerId, hexKey);

  // Clear housed player from town
  delete town.housed;

  showNotification(`${name} left the town`);
  clearTownHousing();

  // Re-render
  renderTowns();
  renderPlayerMarkers();
  renderAllHealthBars();
}

function evictFromTown(hexKey) {
  const town = GameState.hexObjects[hexKey];
  if (!town?.housed) return;

  const { teamId, playerId } = town.housed;
  // Player loses their position (will need to be placed again)
  GameState.setPlayerPosition(teamId, playerId, null);
  delete town.housed;
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
      addTownMarker(hexKey, obj.teamId, obj.housed, isSelected);
    }
  }
}

function addTownMarker(hexKey, teamId, housed, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.border || '#ffffff';

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
    const shiftKey = e.shiftKey;

    // Handle housing mode clicks
    if (townHousingMode === 'housing') {
      handleTownHousing(hexKey);
      return;
    }
    if (townHousingMode === 'evicting') {
      handleTownEvicting(hexKey);
      return;
    }

    // Delegate to other modes if active
    if (isBattleMode()) {
      onBattleModeHexClick(hexKey, null, shiftKey);
      return;
    }
    if (isMoveMode()) {
      onMoveModeHexClick(hexKey, null, shiftKey);
      return;
    }
    if (isCastleMode()) {
      // Delegate to castle mode for upgrade
      onCastleModeHexClick(hexKey, null, metaKey);
      return;
    }
    if (isPlayerMode()) {
      // Delegate to player mode for revival at town
      onPlayerModeHexClick(hexKey, null);
      return;
    }

    // Shift+click to house/evict player (works in any mode or no mode)
    if (shiftKey) {
      const town = GameState.hexObjects[hexKey];
      if (town) {
        enterTownHousing(hexKey, town);
      }
      return;
    }

    // Town mode: Cmd+click to remove
    if (isTownMode()) {
      if (metaKey) {
        removeTown(hexKey);
        showNotification('Town removed');
      } else {
        showNotification('Shift+click to house player. Cmd+click to remove.', 'error');
      }
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

  // Add housed player name label if town has a resident
  if (housed) {
    const housedTeam = GameState.teams[housed.teamId];
    const housedColor = housedTeam?.border || '#ffffff';

    // Name background for readability
    const nameWidth = housed.name.length * 7 + 8;
    const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nameBg.setAttribute('x', centerX - nameWidth / 2);
    nameBg.setAttribute('y', centerY - iconSize / 2 - 20);
    nameBg.setAttribute('width', nameWidth);
    nameBg.setAttribute('height', 14);
    nameBg.setAttribute('rx', 3);
    nameBg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    nameBg.setAttribute('stroke', housedColor);
    nameBg.setAttribute('stroke-width', 1);

    // Housed player name text
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', centerX);
    nameText.setAttribute('y', centerY - iconSize / 2 - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('fill', '#fff');
    nameText.setAttribute('font-size', '11');
    nameText.setAttribute('font-weight', 'bold');
    nameText.classList.add('town-housed-name');
    nameText.textContent = housed.name;

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
