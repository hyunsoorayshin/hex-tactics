// ============================================
// Catapult Mode Module
// ============================================

let catapultMode = false;

function isCatapultMode() {
  return catapultMode;
}

function setCatapultMode(enabled) {
  catapultMode = enabled;
  if (enabled) {
    showCatapultHint();
  } else {
    hideCatapultHint();
  }
}

function toggleCatapultMode() {
  setCatapultMode(!catapultMode);
  return catapultMode;
}

// ============================================
// Catapult Hint UI
// ============================================

function showCatapultHint() {
  let hint = document.getElementById('catapult-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'catapult-hint';
    hint.className = 'mode-hint';
    hint.textContent = 'Click your land to place catapult. Cmd+click to remove.';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideCatapultHint() {
  const hint = document.getElementById('catapult-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Catapult Placement Logic
// ============================================

function onCatapultModeHexClick(hexKey, element, metaKey) {
  const currentTeam = getCurrentTeam();

  if (GameState.hexObjects[hexKey]?.type === 'catapult') {
    if (metaKey) {
      removeCatapult(hexKey);
      showNotification('Catapult removed');
    } else {
      showNotification('Cmd+click to remove catapult', 'error');
    }
  } else {
    if (isWaterHex(hexKey)) {
      showNotification('Cannot place catapult on water', 'error');
      return;
    }
    if (GameState.land[hexKey] !== currentTeam) {
      showNotification('Must place catapult on your land', 'error');
      return;
    }
    placeCatapult(hexKey, currentTeam);
    showNotification('Catapult placed!');
  }
}

function placeCatapult(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'catapult',
    teamId: teamId,
    health: OBJECT_HEALTH.catapult,
    maxHealth: OBJECT_HEALTH.catapult
  };
  renderCatapults();
}

function removeCatapult(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'catapult') {
    delete GameState.hexObjects[hexKey];
    renderCatapults();
  }
}

// ============================================
// Catapult Rendering
// ============================================

function renderCatapults() {
  document.querySelectorAll('.catapult-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="catapult-outline-"]').forEach(f => f.remove());

  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'catapult') {
      addCatapultMarker(hexKey, obj.teamId);
    }
  }
}

function addCatapultMarker(hexKey, teamId) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.catapult;

  const svg = document.getElementById('hex-overlay');

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('catapult-marker');
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
    if (isFleetMode() && fleetInteractionMode === 'boarding') {
      handleFleetBoarding(hexKey);
      return;
    }
    if (isWagonMode() && wagonInteractionMode === 'boarding') {
      handleWagonBoarding(hexKey);
      return;
    }

    if (isCatapultMode()) {
      if (metaKey) {
        removeCatapult(hexKey);
        showNotification('Catapult removed');
      } else {
        showNotification('Cmd+click to remove catapult', 'error');
      }
    }
  });

  // SVG filter for team color outline
  const filterId = `catapult-outline-${hexKey.replace(',', '-')}`;
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

  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/catapult.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('catapult-marker-icon');

  marker.appendChild(icon);
  svg.appendChild(marker);
}
