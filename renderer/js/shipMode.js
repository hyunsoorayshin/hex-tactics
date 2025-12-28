// ============================================
// Ship Mode Module
// ============================================

let shipMode = false;

function isShipMode() {
  return shipMode;
}

function setShipMode(enabled) {
  shipMode = enabled;
  if (enabled) {
    showShipHint();
  } else {
    hideShipHint();
  }
}

function toggleShipMode() {
  setShipMode(!shipMode);
  return shipMode;
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
    hint.textContent = 'Click a hex to place or remove a ship';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideShipHint() {
  const hint = document.getElementById('ship-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Ship Placement Logic
// ============================================

function onShipModeHexClick(hexKey, element) {
  const currentTeam = getCurrentTeam();

  // Check if ship already exists here
  if (GameState.hexObjects[hexKey]?.type === 'ship') {
    // Remove existing ship
    removeShip(hexKey);
    showNotification('Ship removed');
  } else {
    // Place new ship (no land ownership check)
    placeShip(hexKey, currentTeam);
    showNotification('Ship placed!');
  }
}

function placeShip(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'ship',
    teamId: teamId
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
      addShipMarker(hexKey, obj.teamId);
    }
  }
}

function addShipMarker(hexKey, teamId) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = 48;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('ship-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Left-click to remove
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    removeShip(hexKey);
    showNotification('Ship removed');
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
  svg.appendChild(marker);
}
