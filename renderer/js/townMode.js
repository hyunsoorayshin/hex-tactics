// ============================================
// Town Mode Module
// ============================================

let townMode = false;

function isTownMode() {
  return townMode;
}

function setTownMode(enabled) {
  townMode = enabled;
  if (enabled) {
    showTownHint();
  } else {
    hideTownHint();
  }
}

function toggleTownMode() {
  setTownMode(!townMode);
  return townMode;
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
// Town Rendering
// ============================================

function renderTowns() {
  // Remove existing town markers
  document.querySelectorAll('.town-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="town-outline-"]').forEach(f => f.remove());

  // Find all towns (center hexes only)
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'town') {
      addTownMarker(hexKey, obj.teamId);
    }
  }
}

function addTownMarker(hexKey, teamId) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = 64;

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

    // Delegate to other modes if active
    if (isBattleMode()) {
      onBattleModeHexClick(hexKey, null, e.shiftKey);
      return;
    }
    if (isMoveMode()) {
      onMoveModeHexClick(hexKey, null, e.shiftKey);
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

    // Town mode: Cmd+click to remove
    if (isTownMode()) {
      if (metaKey) {
        removeTown(hexKey);
        showNotification('Town removed');
      } else {
        showNotification('Cmd+click to remove town', 'error');
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
  svg.appendChild(marker);
}
