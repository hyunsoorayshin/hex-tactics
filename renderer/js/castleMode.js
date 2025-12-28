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
    hint.className = 'mode-hint';
    hint.textContent = 'Click town to upgrade (19 hexes required). Cmd+click to remove.';
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
// Hex Ring Calculations
// ============================================

// Get the outer ring of 12 hexes (2 steps away from center)
function getOuterRing(hexKey) {
  const [q, r] = hexKey.split(',').map(Number);
  const outerHexes = [];

  // Outer ring: hexes that are 2 steps away
  // Starting from top-right, going clockwise
  const outerOffsets = [
    // Top section (3 hexes)
    [0, -2], [1, -2], [2, -2],
    // Right-top (2 hexes)
    [2, -1], [2, 0],
    // Right-bottom (2 hexes)
    [1, 1], [0, 2],
    // Bottom section (3 hexes - but overlaps, so adjusted)
    [-1, 2], [-2, 2],
    // Left-bottom (2 hexes)
    [-2, 1], [-2, 0],
    // Left-top (2 hexes)
    [-1, -1]
  ];

  // For pointy-top hex, the outer ring at distance 2 has 12 hexes
  // Using axial coordinate system
  for (let i = 0; i < 6; i++) {
    // Direction vectors for hex
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    // Get the hex 2 steps in direction i
    const dq = directions[i][0] * 2;
    const dr = directions[i][1] * 2;
    outerHexes.push(new Hex(q + dq, r + dr));

    // Get the hex between direction i and i+1 (at distance 2)
    const nextI = (i + 1) % 6;
    const midQ = directions[i][0] + directions[nextI][0];
    const midR = directions[i][1] + directions[nextI][1];
    outerHexes.push(new Hex(q + midQ, r + midR));
  }

  return outerHexes;
}

// Get all 19 hexes for a castle (center + inner 6 + outer 12)
function getCastleHexes(hexKey) {
  const innerHexes = getHexAndNeighbors(hexKey); // 7 hexes (center + 6)
  const outerHexes = getOuterRing(hexKey); // 12 hexes
  return { inner: innerHexes, outer: outerHexes, all: [...innerHexes, ...outerHexes] };
}

// ============================================
// Castle Placement Logic
// ============================================

function canPlaceCastle(hexKey, teamId) {
  // Check if there's a town at this hex
  const centerObj = GameState.hexObjects[hexKey];
  if (!centerObj || centerObj.type !== 'town') {
    return { valid: false, reason: 'Must upgrade from an existing town' };
  }

  // Check if town belongs to this team
  if (centerObj.teamId !== teamId) {
    return { valid: false, reason: 'Can only upgrade your own town' };
  }

  // Get all 19 hexes needed
  const { inner, outer, all } = getCastleHexes(hexKey);

  // Check if all 19 hexes are owned by this team
  for (const hex of all) {
    const key = hex.toString();
    if (GameState.land[key] !== teamId) {
      return { valid: false, reason: 'All 19 hexes must be your land' };
    }
  }

  // Check if outer ring hexes are free (inner ring is town territory, that's ok)
  for (const hex of outer) {
    const key = hex.toString();
    const obj = GameState.hexObjects[key];
    if (obj && obj.type !== 'town-territory' && obj.centerHex !== hexKey) {
      // Allow town-territory that belongs to this town
      if (obj.type === 'castle' || obj.type === 'castle-territory' ||
          obj.type === 'town' || obj.type === 'town-territory') {
        return { valid: false, reason: 'Cannot overlap with other structures' };
      }
    }
  }

  return { valid: true };
}

function onCastleModeHexClick(hexKey, element, metaKey) {
  const currentTeam = getCurrentTeam();

  // Check if clicking on existing castle
  const existingObj = GameState.hexObjects[hexKey];
  if (existingObj?.type === 'castle' || existingObj?.type === 'castle-territory') {
    // Cmd+click to remove
    if (metaKey) {
      const centerHex = existingObj.type === 'castle' ? hexKey : existingObj.centerHex;
      removeCastle(centerHex);
      showNotification('Castle removed');
    } else {
      showNotification('Cmd+click to remove castle', 'error');
    }
    return;
  }

  // Try to place castle (upgrade from town)
  const result = canPlaceCastle(hexKey, currentTeam);
  if (!result.valid) {
    showNotification(result.reason, 'error');
    return;
  }

  placeCastle(hexKey, currentTeam);
  showNotification('Town upgraded to Castle!');
}

function placeCastle(hexKey, teamId) {
  // Get all hexes
  const { inner, outer } = getCastleHexes(hexKey);

  // Remove existing town and its territory first
  for (const hex of inner) {
    const key = hex.toString();
    if (GameState.hexObjects[key]?.type === 'town' ||
        GameState.hexObjects[key]?.type === 'town-territory') {
      delete GameState.hexObjects[key];
    }
  }

  // Store castle in game state (center hex)
  GameState.hexObjects[hexKey] = {
    type: 'castle',
    teamId: teamId,
    health: OBJECT_HEALTH.castle,
    maxHealth: OBJECT_HEALTH.castle
  };

  // Mark inner ring (6 hexes) as castle territory
  for (const hex of inner) {
    const key = hex.toString();
    if (key !== hexKey) {
      GameState.hexObjects[key] = {
        type: 'castle-territory',
        teamId: teamId,
        centerHex: hexKey,
        ring: 'inner'
      };
    }
  }

  // Mark outer ring (12 hexes) as castle territory
  for (const hex of outer) {
    const key = hex.toString();
    GameState.hexObjects[key] = {
      type: 'castle-territory',
      teamId: teamId,
      centerHex: hexKey,
      ring: 'outer'
    };
  }

  console.log(`Placed castle for team ${teamId} at ${hexKey}`);
  renderCastles();
  renderTowns(); // Re-render towns to remove the upgraded one
}

function removeCastle(hexKey) {
  const obj = GameState.hexObjects[hexKey];
  if (!obj) return;

  // If this is the center, remove the castle and all territory
  if (obj.type === 'castle') {
    const { all } = getCastleHexes(hexKey);
    for (const hex of all) {
      delete GameState.hexObjects[hex.toString()];
    }
  }
  // If this is territory, find and remove the whole castle
  else if (obj.type === 'castle-territory') {
    removeCastle(obj.centerHex);
    return;
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
  const iconSize = 100;
  const iconX = centerX - iconSize / 2;
  const iconY = centerY - iconSize / 2;

  const svg = document.getElementById('hex-overlay');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('castle-marker');
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
    if (isPlayerMode()) {
      // Delegate to player mode for revival at castle
      onPlayerModeHexClick(hexKey, null);
      return;
    }

    // Castle mode: Cmd+click to remove
    if (isCastleMode()) {
      if (metaKey) {
        removeCastle(hexKey);
        showNotification('Castle removed');
      } else {
        showNotification('Cmd+click to remove castle', 'error');
      }
    }
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
