// ============================================
// Wall Mode Module
// ============================================

let wallMode = false;

function isWallMode() {
  return wallMode;
}

function setWallMode(enabled) {
  wallMode = enabled;
  if (enabled) {
    showWallHint();
  } else {
    hideWallHint();
  }
}

function toggleWallMode() {
  setWallMode(!wallMode);
  return wallMode;
}

// ============================================
// Wall Hint UI
// ============================================

function showWallHint() {
  let hint = document.getElementById('wall-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'wall-hint';
    hint.className = 'mode-hint';
    hint.textContent = 'Click edge to place wall. Cmd+click to remove.';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideWallHint() {
  const hint = document.getElementById('wall-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Wall Placement Logic
// ============================================

function onWallModeEdgeClick(edgeKey, element, metaKey) {
  const currentTeam = getCurrentTeam();

  // Check if wall already exists here
  if (GameState.edgeObjects[edgeKey]?.type === 'wall') {
    // Cmd+click to remove
    if (metaKey) {
      removeWall(edgeKey);
      showNotification('Wall removed');
    } else {
      showNotification('Cmd+click to remove wall', 'error');
    }
  } else {
    // Place new wall
    placeWall(edgeKey, currentTeam);
    showNotification('Wall placed!');
  }
}

function placeWall(edgeKey, teamId) {
  GameState.edgeObjects[edgeKey] = {
    type: 'wall',
    teamId: teamId,
    health: OBJECT_HEALTH.wall,
    maxHealth: OBJECT_HEALTH.wall
  };

  console.log(`Placed wall for team ${teamId} at edge ${edgeKey}`);
  renderWalls();
}

function removeWall(edgeKey) {
  if (GameState.edgeObjects[edgeKey]?.type === 'wall') {
    delete GameState.edgeObjects[edgeKey];
    renderWalls();
  }
}

// ============================================
// Wall Rendering
// ============================================

function renderWalls() {
  // Remove existing wall markers and filters
  document.querySelectorAll('.wall-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="wall-outline-"]').forEach(f => f.remove());

  // Find all walls
  for (const [edgeKey, obj] of Object.entries(GameState.edgeObjects)) {
    if (obj.type === 'wall') {
      addWallMarker(edgeKey, obj.teamId);
    }
  }
}

function addWallMarker(edgeKey, teamId) {
  // Parse edge key: "q,r,side"
  const parts = edgeKey.split(',');
  const q = parseInt(parts[0]);
  const r = parseInt(parts[1]);
  const side = parseInt(parts[2]);

  const hex = new Hex(q, r);
  const corners = getHexCorners(hex);
  const p1 = corners[side];
  const p2 = corners[(side + 1) % 6];

  // Calculate edge center and angle
  const centerX = (p1.x + p2.x) / 2;
  const centerY = (p1.y + p2.y) / 2;
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

  const team = GameState.teams[teamId];
  const teamColor = team?.border || '#ffffff';

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('wall-marker');
  marker.setAttribute('data-edge', edgeKey);
  marker.setAttribute('data-team', teamId);

  // Click handler - delegate to appropriate mode
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    // Delegate to battle mode if active (walls can be attacked)
    if (isBattleMode()) {
      onBattleModeEdgeClick(edgeKey, null, e.shiftKey);
      return;
    }

    // Wall mode: Cmd+click to remove
    if (isWallMode()) {
      if (metaKey) {
        removeWall(edgeKey);
        showNotification('Wall removed');
      } else {
        showNotification('Cmd+click to remove wall', 'error');
      }
    }
  });

  // Create SVG filter for team color outline
  const filterId = `wall-outline-${edgeKey.replace(/,/g, '-')}`;
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

  // Wall image - sized to fit edge length
  const edgeLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  const iconWidth = edgeLength;
  const iconHeight = 24;

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('href', '../assets/edge-objects/wall.png');
  icon.setAttribute('width', iconWidth);
  icon.setAttribute('height', iconHeight);
  icon.setAttribute('x', -iconWidth / 2);
  icon.setAttribute('y', -iconHeight / 2);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.setAttribute('transform', `translate(${centerX}, ${centerY}) rotate(${angle})`);

  marker.appendChild(icon);
  svg.appendChild(marker);
}
