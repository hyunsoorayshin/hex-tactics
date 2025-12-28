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
    hint.textContent = 'Click your land to place or remove a town';
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

function onTownModeHexClick(hexKey, element) {
  const currentTeam = getCurrentTeam();

  // Check if town already exists here
  if (GameState.hexObjects[hexKey]?.type === 'town') {
    // Remove existing town
    removeTown(hexKey);
    showNotification('Town removed');
  } else {
    // Check land ownership
    if (GameState.land[hexKey] !== currentTeam) {
      showNotification('Must place town on your land', 'error');
      return;
    }
    // Place new town
    placeTown(hexKey, currentTeam);
    showNotification('Town placed!');
  }
}

function placeTown(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'town',
    teamId: teamId
  };

  console.log(`Placed town for team ${teamId} at ${hexKey}`);
  renderTowns();
}

function removeTown(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'town') {
    delete GameState.hexObjects[hexKey];
    renderTowns();
  }
}

// ============================================
// Town Rendering
// ============================================

function renderTowns() {
  // Remove existing town markers
  document.querySelectorAll('.town-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="town-outline-"]').forEach(f => f.remove());

  // Find all towns
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

  const iconSize = 48;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('town-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Left-click to remove
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    removeTown(hexKey);
    showNotification('Town removed');
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
