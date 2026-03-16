// ============================================
// Mineral Mode Module
// ============================================

let mineralMode = false;

function isMineralMode() {
  return mineralMode;
}

function setMineralMode(enabled) {
  mineralMode = enabled;
  if (enabled) {
    showMineralHint();
  } else {
    hideMineralHint();
  }
}

function toggleMineralMode() {
  setMineralMode(!mineralMode);
  return mineralMode;
}

// ============================================
// Mineral Hint UI
// ============================================

function showMineralHint() {
  let hint = document.getElementById('mineral-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'mineral-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  hint.textContent = 'Click to place mineral. Cmd+click to remove.';
  hint.classList.add('visible');
}

function hideMineralHint() {
  const hint = document.getElementById('mineral-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Mineral Placement Logic
// ============================================

function onMineralModeHexClick(hexKey, element, metaKey) {
  const existing = GameState.hexObjects[hexKey];

  if (existing?.type === 'mineral') {
    if (metaKey) {
      removeMineral(hexKey);
      showNotification('Mineral removed');
    } else {
      showNotification('Cmd+click to remove mineral', 'error');
    }
  } else {
    placeMineral(hexKey);
    showNotification('Mineral placed!');
  }
}

function placeMineral(hexKey) {
  GameState.hexObjects[hexKey] = {
    type: 'mineral',
    teamId: -1, // Neutral — no team
    health: OBJECT_HEALTH.mineral,
    maxHealth: OBJECT_HEALTH.mineral
  };
  renderMinerals();
}

function removeMineral(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'mineral') {
    delete GameState.hexObjects[hexKey];
    renderMinerals();
  }
}

// ============================================
// Mineral Rendering
// ============================================

function renderMinerals() {
  document.querySelectorAll('.mineral-marker').forEach(m => m.remove());

  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'mineral') {
      addMineralMarker(hexKey);
    }
  }
}

function addMineralMarker(hexKey) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.mineral;

  const svg = document.getElementById('hex-overlay');

  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('mineral-marker');
  marker.setAttribute('data-hex', hexKey);

  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    if (isLandMode()) {
      onLandClick(hexKey, null);
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

    if (isMineralMode()) {
      onMineralModeHexClick(hexKey, null, metaKey);
    }
  });

  // Mineral icon
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/mineral.png`);
  icon.classList.add('mineral-marker-icon');

  marker.appendChild(icon);
  svg.appendChild(marker);
}
