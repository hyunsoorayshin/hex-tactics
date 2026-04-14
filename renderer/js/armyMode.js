// ============================================
// Army Mode Module
// ============================================

let armyMode = false;

function isArmyMode() {
  return armyMode;
}

function setArmyMode(enabled) {
  armyMode = enabled;
  if (enabled) {
    showArmyHint();
  } else {
    hideArmyHint();
  }
}

function toggleArmyMode() {
  setArmyMode(!armyMode);
  return armyMode;
}

// ============================================
// Army Hint UI
// ============================================

function showArmyHint() {
  let hint = document.getElementById('army-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'army-hint';
    hint.className = 'mode-hint';
    hint.textContent = 'Click your land to place army. Cmd+click to remove.';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideArmyHint() {
  const hint = document.getElementById('army-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Army Placement Logic
// ============================================

function onArmyModeHexClick(hexKey, element, metaKey) {
  const currentTeam = getCurrentTeam();

  // Check if army already exists here
  if (GameState.hexObjects[hexKey]?.type === 'army') {
    // Cmd+click to remove
    if (metaKey) {
      removeArmy(hexKey);
      showNotification('Army removed');
    } else {
      showNotification('Cmd+click to remove army', 'error');
    }
  } else {
    // Check land ownership
    if (GameState.land[hexKey] !== currentTeam) {
      showNotification('Must place army on your land', 'error');
      return;
    }
    // Place new army
    placeArmy(hexKey, currentTeam);
    showNotification('Army placed!');
  }
}

function placeArmy(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'army',
    teamId: teamId,
    health: OBJECT_HEALTH.army,
    maxHealth: OBJECT_HEALTH.army
  };

  console.log(`Placed army for team ${teamId} at ${hexKey}`);
  renderArmies();
}

function removeArmy(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'army') {
    delete GameState.hexObjects[hexKey];
    renderArmies();
  }
}

// ============================================
// Army Rendering
// ============================================

function renderArmies() {
  // Remove existing army markers
  document.querySelectorAll('.army-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="army-outline-"]').forEach(f => f.remove());

  // Find all armies
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'army') {
      addArmyMarker(hexKey, obj.teamId);
    }
  }
}

function addArmyMarker(hexKey, teamId) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.army;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('army-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Click handler - delegate to appropriate mode
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    // Delegate to other modes if active
    if (isLandMode()) {
      const hexEl = document.querySelector(`.hex[data-hex="${hexKey}"]`);
      onLandClick(hexKey, hexEl);
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
    if (isFleetMode() && fleetInteractionMode === 'boarding') {
      handleFleetBoarding(hexKey);
      return;
    }
    if (isWagonMode() && wagonInteractionMode === 'boarding') {
      handleWagonBoarding(hexKey);
      return;
    }

    // Army mode: Cmd+click to remove
    if (isArmyMode()) {
      if (metaKey) {
        removeArmy(hexKey);
        showNotification('Army removed');
      } else {
        showNotification('Cmd+click to remove army', 'error');
      }
    }
  });

  // Create SVG filter for team color outline
  const filterId = `army-outline-${hexKey.replace(',', '-')}`;
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

  // Army image (centered)
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/army.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('army-marker-icon');

  marker.appendChild(icon);
  svg.appendChild(marker);
}
