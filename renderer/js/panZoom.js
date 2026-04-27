// ============================================
// Pan & Zoom Module
// ============================================

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
let spacePressed = false;

const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_SPEED = 0.1;

// DOM references (set during init)
let viewport = null;
let mapContainer = null;

function initPanZoom() {
  viewport = document.getElementById('viewport');
  mapContainer = document.getElementById('map-container');

  // Set up event listeners
  setupWheelZoom();
  setupPanControls();

  // Provide space check to hex grid module
  if (typeof setSpacePressedCheck === 'function') {
    setSpacePressedCheck(() => spacePressed);
  }
}

function updateTransform() {
  mapContainer.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function resetView() {
  // Fit map to viewport
  const vw = viewport.clientWidth;
  const vh = viewport.clientHeight;
  scale = Math.min(vw / MAP_WIDTH, vh / MAP_HEIGHT);
  translateX = (vw - MAP_WIDTH * scale) / 2;
  translateY = (vh - MAP_HEIGHT * scale) / 2;
  updateTransform();
}

function setupWheelZoom() {
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate position in map space before zoom
    const mapX = (mouseX - translateX) / scale;
    const mapY = (mouseY - translateY) / scale;

    // Apply zoom
    const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta * scale));

    // Adjust translation to zoom toward mouse position
    translateX = mouseX - mapX * newScale;
    translateY = mouseY - mapY * newScale;
    scale = newScale;

    updateTransform();
  }, { passive: false });
}

function setupPanControls() {
  // Pan with spacebar + drag
  viewport.addEventListener('mousedown', (e) => {
    if (spacePressed && e.button === 0) {
      isPanning = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      viewport.style.cursor = 'grabbing';
      e.preventDefault();
    }
  });

  viewport.addEventListener('mousemove', (e) => {
    if (isPanning) {
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    }
  });

  viewport.addEventListener('mouseup', () => {
    if (isPanning) {
      isPanning = false;
      viewport.style.cursor = spacePressed ? 'grab' : 'default';
    }
  });
}

// Space key handlers (called from main keyboard handler)
function onSpaceDown() {
  spacePressed = true;
  if (viewport) {
    viewport.style.cursor = isPanning ? 'grabbing' : 'grab';
  }
}

function onSpaceUp() {
  spacePressed = false;
  isPanning = false;
  if (viewport) {
    viewport.style.cursor = 'default';
  }
}

function isSpacePressedState() {
  return spacePressed;
}
