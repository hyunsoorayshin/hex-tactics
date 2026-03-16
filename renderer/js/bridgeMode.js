// ============================================
// Bridge Mode Module
// ============================================

let bridgeMode = false;

function isBridgeMode() {
  return bridgeMode;
}

function setBridgeMode(enabled) {
  bridgeMode = enabled;
  if (enabled) {
    showBridgeHint();
  } else {
    hideBridgeHint();
  }
}

function toggleBridgeMode() {
  setBridgeMode(!bridgeMode);
  return bridgeMode;
}

// ============================================
// Bridge Hint UI
// ============================================

function showBridgeHint() {
  let hint = document.getElementById('bridge-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'bridge-hint';
    hint.className = 'mode-hint';
    hint.textContent = 'Click to place bridge. Right-click to rotate. Cmd+click to remove.';
    document.body.appendChild(hint);
  }
  hint.classList.add('visible');
}

function hideBridgeHint() {
  const hint = document.getElementById('bridge-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

// ============================================
// Bridge Placement Logic
// ============================================

function onBridgeModeHexClick(hexKey, element, metaKey) {
  const currentTeam = getCurrentTeam();

  // Check if bridge already exists here
  if (GameState.hexObjects[hexKey]?.type === 'bridge') {
    // Cmd+click to remove
    if (metaKey) {
      removeBridge(hexKey);
      showNotification('Bridge removed');
    } else {
      showNotification('Cmd+click to remove. Right-click to rotate.', 'error');
    }
  } else {
    // Place new bridge
    placeBridge(hexKey, currentTeam);
    showNotification('Bridge placed!');
  }
}

function placeBridge(hexKey, teamId) {
  GameState.hexObjects[hexKey] = {
    type: 'bridge',
    teamId: teamId,
    rotation: 0,  // 0, 60, or 120 degrees (side-to-side orientations)
    health: OBJECT_HEALTH.bridge,
    maxHealth: OBJECT_HEALTH.bridge
  };

  console.log(`Placed bridge for team ${teamId} at ${hexKey}`);
  renderBridges();
}

function rotateBridge(hexKey) {
  const obj = GameState.hexObjects[hexKey];
  if (obj?.type === 'bridge') {
    // Rotate by 60 degrees (3 side-to-side orientations: 0°, 60°, 120°)
    const current = obj.rotation || 0;
    obj.rotation = current >= 120 ? 0 : current + 60;
    console.log(`Rotated bridge at ${hexKey} to ${obj.rotation} degrees`);
    renderBridges();
  }
}

function removeBridge(hexKey) {
  if (GameState.hexObjects[hexKey]?.type === 'bridge') {
    delete GameState.hexObjects[hexKey];
    renderBridges();
  }
}

// ============================================
// Bridge Rendering
// ============================================

function renderBridges() {
  // Remove existing bridge markers
  document.querySelectorAll('.bridge-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="bridge-outline-"]').forEach(f => f.remove());

  // Find all bridges
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'bridge') {
      addBridgeMarker(hexKey, obj.teamId, obj.rotation || 0);
    }
  }
}

function addBridgeMarker(hexKey, teamId, rotation) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.bridge;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('bridge-marker');
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

    // Bridge mode: Cmd+click to remove
    if (isBridgeMode()) {
      if (metaKey) {
        removeBridge(hexKey);
        showNotification('Bridge removed');
      } else {
        showNotification('Cmd+click to remove. Right-click to rotate.', 'error');
      }
    }
  });

  // Right-click to rotate
  marker.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    rotateBridge(hexKey);
  });

  // Create SVG filter for team color outline
  const filterId = `bridge-outline-${hexKey.replace(',', '-')}`;
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

  // Bridge image (centered and rotated)
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', -iconSize / 2);
  icon.setAttribute('y', -iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/bridge.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('bridge-marker-icon');

  // Apply position and rotation to marker group
  marker.setAttribute('transform', `translate(${centerX}, ${centerY}) rotate(${rotation})`);
  marker.appendChild(icon);
  svg.appendChild(marker);
}
