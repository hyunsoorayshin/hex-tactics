// ============================================
// Terrain Mode Module (Map Editor Tool)
// Drag box to select hexes as water, export as JSON
// ============================================

let terrainMode = false;
// Initialize from hardcoded water hex data
const waterHexes = new Set(WATER_HEXES);

// Marquee drag state
let terrainDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let marqueeEl = null;

function isTerrainMode() {
  return terrainMode;
}

function setTerrainMode(enabled) {
  terrainMode = enabled;
  if (enabled) {
    showTerrainHint();
    renderWaterOverlay();
    initTerrainDrag();
  } else {
    hideTerrainHint();
    cleanupTerrainDrag();
  }
}

function toggleTerrainMode() {
  setTerrainMode(!terrainMode);
  return terrainMode;
}

// ============================================
// Terrain Hint UI
// ============================================

function showTerrainHint() {
  let hint = document.getElementById('terrain-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'terrain-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  hint.textContent = `Terrain mode: Drag to select water. Cmd+drag to erase. E to export. (${waterHexes.size} water hexes)`;
  hint.classList.add('visible');
}

function hideTerrainHint() {
  const hint = document.getElementById('terrain-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateTerrainHint() {
  const hint = document.getElementById('terrain-hint');
  if (hint) {
    hint.textContent = `Terrain mode: Drag to select water. Cmd+drag to erase. E to export. (${waterHexes.size} water hexes)`;
  }
}

// ============================================
// Coordinate conversion
// ============================================

function clientToMap(clientX, clientY) {
  const container = document.getElementById('map-container');
  const rect = container.getBoundingClientRect();
  // getBoundingClientRect accounts for CSS transforms
  const scaleX = container.offsetWidth / rect.width;
  const scaleY = container.offsetHeight / rect.height;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

// ============================================
// Click handler (single click toggle)
// ============================================

function onTerrainModeHexClick(hexKey, element) {
  if (waterHexes.has(hexKey)) {
    waterHexes.delete(hexKey);
    if (element) element.classList.remove('water-hex');
  } else {
    waterHexes.add(hexKey);
    if (element) element.classList.add('water-hex');
  }
  updateTerrainHint();
}

// ============================================
// Marquee Selection
// ============================================

function createMarquee() {
  if (marqueeEl) marqueeEl.remove();
  marqueeEl = document.createElement('div');
  marqueeEl.id = 'terrain-marquee';
  document.body.appendChild(marqueeEl);
  return marqueeEl;
}

function updateMarquee(startClientX, startClientY, currentClientX, currentClientY) {
  if (!marqueeEl) return;
  const left = Math.min(startClientX, currentClientX);
  const top = Math.min(startClientY, currentClientY);
  const width = Math.abs(currentClientX - startClientX);
  const height = Math.abs(currentClientY - startClientY);
  marqueeEl.style.left = left + 'px';
  marqueeEl.style.top = top + 'px';
  marqueeEl.style.width = width + 'px';
  marqueeEl.style.height = height + 'px';
}

function removeMarquee() {
  if (marqueeEl) {
    marqueeEl.remove();
    marqueeEl = null;
  }
}

function getHexesInRect(mapX1, mapY1, mapX2, mapY2) {
  const minX = Math.min(mapX1, mapX2);
  const maxX = Math.max(mapX1, mapX2);
  const minY = Math.min(mapY1, mapY2);
  const maxY = Math.max(mapY1, mapY2);

  const results = [];
  document.querySelectorAll('.hex[data-hex]').forEach(hexEl => {
    const bbox = hexEl.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    if (cx >= minX && cx <= maxX && cy >= minY && cy <= maxY) {
      results.push({ hexKey: hexEl.getAttribute('data-hex'), element: hexEl });
    }
  });
  return results;
}

// ============================================
// Drag handlers
// ============================================

let _startClientX = 0;
let _startClientY = 0;
let _eraseMode = false;
let _didDrag = false;
const DRAG_THRESHOLD = 5;

function onTerrainMouseDown(e) {
  if (!terrainMode) return;
  if (e.button !== 0) return;
  if (typeof isSpacePressedState === 'function' && isSpacePressedState()) return;

  e.preventDefault();
  terrainDragging = true;
  _didDrag = false;
  _startClientX = e.clientX;
  _startClientY = e.clientY;
  _eraseMode = e.metaKey || e.ctrlKey;
}

function onTerrainMouseMove(e) {
  if (!terrainDragging) return;
  e.preventDefault();

  const dx = e.clientX - _startClientX;
  const dy = e.clientY - _startClientY;

  if (!_didDrag && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
    _didDrag = true;
    createMarquee();
  }

  if (_didDrag) {
    updateMarquee(_startClientX, _startClientY, e.clientX, e.clientY);
  }
}

function onTerrainMouseUp(e) {
  if (!terrainDragging) return;
  terrainDragging = false;

  if (!_didDrag) {
    // Single click — let the hex click handler deal with it
    removeMarquee();
    return;
  }

  // Drag selection — find hexes in rectangle
  const start = clientToMap(_startClientX, _startClientY);
  const end = clientToMap(e.clientX, e.clientY);
  const hexes = getHexesInRect(start.x, start.y, end.x, end.y);

  if (_eraseMode) {
    for (const { hexKey, element } of hexes) {
      waterHexes.delete(hexKey);
      element.classList.remove('water-hex');
    }
    if (hexes.length > 0) showNotification(`Removed ${hexes.length} water hexes`);
  } else {
    for (const { hexKey, element } of hexes) {
      waterHexes.add(hexKey);
      element.classList.add('water-hex');
    }
    if (hexes.length > 0) showNotification(`Added ${hexes.length} water hexes`);
  }

  removeMarquee();
  updateTerrainHint();
}

// ============================================
// Event listener management
// ============================================

let _boundDown = null;
let _boundMove = null;
let _boundUp = null;

function initTerrainDrag() {
  const viewport = document.getElementById('viewport');
  if (!viewport) return;

  _boundDown = onTerrainMouseDown;
  _boundMove = onTerrainMouseMove;
  _boundUp = onTerrainMouseUp;

  viewport.addEventListener('mousedown', _boundDown, true);
  window.addEventListener('mousemove', _boundMove);
  window.addEventListener('mouseup', _boundUp);
}

function cleanupTerrainDrag() {
  const viewport = document.getElementById('viewport');
  if (viewport && _boundDown) {
    viewport.removeEventListener('mousedown', _boundDown, true);
  }
  if (_boundMove) window.removeEventListener('mousemove', _boundMove);
  if (_boundUp) window.removeEventListener('mouseup', _boundUp);
  terrainDragging = false;
  removeMarquee();
}

// ============================================
// Water Overlay Rendering
// ============================================

function renderWaterOverlay() {
  document.querySelectorAll('.hex[data-hex]').forEach(hexEl => {
    const hexKey = hexEl.getAttribute('data-hex');
    if (waterHexes.has(hexKey)) {
      hexEl.classList.add('water-hex');
    } else {
      hexEl.classList.remove('water-hex');
    }
  });
}

// ============================================
// Export
// ============================================

function exportTerrainData() {
  const data = Array.from(waterHexes).sort();
  const json = JSON.stringify(data, null, 2);
  window.gameAPI.exportTerrain(json);
  showNotification(`Exporting ${data.length} water hexes...`);
}
