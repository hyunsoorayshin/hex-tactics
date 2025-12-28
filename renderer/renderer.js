const map = document.getElementById('map');

let scale = 1;
let translateX = 0;
let translateY = 0;
let isPanning = false;
let startX = 0;
let startY = 0;
let spacePressed = false;

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_SPEED = 0.1;

function updateTransform() {
  map.style.transform = `translate(-50%, -50%) translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function resetView() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  updateTransform();
}

// Scroll to zoom
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -ZOOM_SPEED : ZOOM_SPEED;
  const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale + delta));

  if (newScale === 1) {
    translateX = 0;
    translateY = 0;
  }

  scale = newScale;
  updateTransform();
}, { passive: false });

// Track spacebar
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    resetView();
  }
  if (e.code === 'Space') {
    e.preventDefault();
    spacePressed = true;
    document.body.style.cursor = isPanning ? 'grabbing' : 'grab';
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    spacePressed = false;
    isPanning = false;
    document.body.style.cursor = 'default';
  }
});

// Start pan on mousedown while space is held
window.addEventListener('mousedown', (e) => {
  if (spacePressed && e.button === 0) {
    isPanning = true;
    startX = e.clientX - translateX;
    startY = e.clientY - translateY;
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  }
});

// Pan while dragging
window.addEventListener('mousemove', (e) => {
  if (isPanning) {
    translateX = e.clientX - startX;
    translateY = e.clientY - startY;
    updateTransform();
  }
});

// Stop pan on mouseup
window.addEventListener('mouseup', () => {
  if (isPanning) {
    isPanning = false;
    document.body.style.cursor = spacePressed ? 'grab' : 'default';
  }
});
