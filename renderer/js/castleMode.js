// ============================================
// Castle Mode Module
// ============================================

let castleMode = false;

function isCastleMode() {
  return castleMode;
}

function setCastleMode(enabled) {
  castleMode = enabled;
  if (enabled) {
    showCastleHint();
  } else {
    hideCastleHint();
  }
}

function toggleCastleMode() {
  setCastleMode(!castleMode);
  return castleMode;
}

// ============================================
// Castle Hint UI
// ============================================

function showCastleHint() {
  let hint = document.getElementById('castle-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'castle-hint';
    hint.className = 'castle-hint';
    hint.textContent = 'Click a hex to place castle (requires 7 hexes of your land)';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideCastleHint() {
  const hint = document.getElementById('castle-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Castle Placement Logic
// ============================================

function canPlaceCastle(hexKey, teamId) {
  // Get center hex and all 6 neighbors
  const hexes = getHexAndNeighbors(hexKey);

  // Check if all 7 hexes are owned by this team
  for (const hex of hexes) {
    const key = hex.toString();
    if (GameState.land[key] !== teamId) {
      return { valid: false, reason: 'All 7 hexes must be your land' };
    }
  }

  // Check if any of these hexes already have a castle
  for (const hex of hexes) {
    const key = hex.toString();
    const obj = GameState.hexObjects[key];
    if (obj && obj.type === 'castle') {
      return { valid: false, reason: 'Cannot overlap with existing castle' };
    }
  }

  return { valid: true };
}

function onCastleModeHexClick(hexKey, element) {
  const currentTeam = getCurrentTeam();
  const result = canPlaceCastle(hexKey, currentTeam);

  if (!result.valid) {
    showNotification(result.reason, 'error');
    return;
  }

  // Place the castle
  placeCastle(hexKey, currentTeam);
  showNotification('Castle placed!');
}

function placeCastle(hexKey, teamId) {
  // Store castle in game state (center hex)
  GameState.hexObjects[hexKey] = {
    type: 'castle',
    teamId: teamId,
    data: {}
  };

  // Mark all 7 hexes as part of this castle
  const hexes = getHexAndNeighbors(hexKey);
  for (const hex of hexes) {
    const key = hex.toString();
    if (key !== hexKey) {
      GameState.hexObjects[key] = {
        type: 'castle-territory',
        teamId: teamId,
        centerHex: hexKey
      };
    }
  }

  console.log(`Placed castle for team ${teamId} at ${hexKey}`);

  // Render the castle
  renderCastles();
}

function removeCastle(hexKey) {
  const obj = GameState.hexObjects[hexKey];
  if (!obj) return;

  // If this is the center, remove the castle and all territory
  if (obj.type === 'castle') {
    const hexes = getHexAndNeighbors(hexKey);
    for (const hex of hexes) {
      delete GameState.hexObjects[hex.toString()];
    }
  }
  // If this is territory, find and remove the whole castle
  else if (obj.type === 'castle-territory') {
    removeCastle(obj.centerHex);
  }

  renderCastles();
}

// ============================================
// Castle Rendering
// ============================================

function renderCastles() {
  // Remove existing castle markers
  document.querySelectorAll('.castle-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="castle-outline-"]').forEach(f => f.remove());

  // Find all castles (center hexes only)
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'castle') {
      addCastleMarker(hexKey, obj.teamId);
    }
  }
}

function addCastleMarker(hexKey, teamId) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  // Castle icon size (spans multiple hexes, so larger)
  const iconSize = 80;
  const iconX = centerX - iconSize / 2;
  const iconY = centerY - iconSize / 2;

  const svg = document.getElementById('hex-overlay');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('castle-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Click to remove
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    removeCastle(hexKey);
    showNotification('Castle removed');
  });

  // Create SVG filter for team color outline
  const filterId = `castle-outline-${hexKey.replace(',', '-')}`;
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
  morphology.setAttribute('radius', '3');
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

  // Castle image
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', iconX);
  icon.setAttribute('y', iconY);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/castle${teamId === 0 ? 10 : teamId}.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('castle-marker-icon');

  marker.appendChild(icon);
  svg.appendChild(marker);
}
