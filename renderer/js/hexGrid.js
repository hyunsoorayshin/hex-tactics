// ============================================
// Hex Grid Module (Red Blob Games algorithm)
// ============================================

// Map Configuration
const MAP_WIDTH = 4096;
const MAP_HEIGHT = 2442;

// Hex grid configuration
const HEX_SIZE = 36;
const HEX_ORIGIN_X = 40;
const HEX_ORIGIN_Y = 40;

// Hex class
class Hex {
  constructor(q, r) {
    this.q = q;
    this.r = r;
  }

  toString() {
    return `${this.q},${this.r}`;
  }
}

// Pointy-top orientation matrices
const Orientation = {
  f0: Math.sqrt(3), f1: Math.sqrt(3) / 2, f2: 0, f3: 3 / 2,
  b0: Math.sqrt(3) / 3, b1: -1 / 3, b2: 0, b3: 2 / 3,
  startAngle: 0.5 // 30 degrees for pointy-top
};

const layout = {
  orientation: Orientation,
  size: HEX_SIZE,
  origin: { x: HEX_ORIGIN_X, y: HEX_ORIGIN_Y }
};

function hexToPixel(hex) {
  const M = layout.orientation;
  const size = layout.size;
  const origin = layout.origin;
  const x = (M.f0 * hex.q + M.f1 * hex.r) * size;
  const y = (M.f2 * hex.q + M.f3 * hex.r) * size;
  return { x: x + origin.x, y: y + origin.y };
}

function hexCornerOffset(corner) {
  const M = layout.orientation;
  const size = layout.size;
  const angle = 2 * Math.PI * (M.startAngle + corner) / 6;
  return { x: size * Math.cos(angle), y: size * Math.sin(angle) };
}

function getHexCorners(hex) {
  const corners = [];
  const center = hexToPixel(hex);
  for (let i = 0; i < 6; i++) {
    const offset = hexCornerOffset(i);
    corners.push({ x: center.x + offset.x, y: center.y + offset.y });
  }
  return corners;
}

// Get edge center point and angle for placing edge objects
function getEdgeCenter(hex, side) {
  const corners = getHexCorners(hex);
  const p1 = corners[side];
  const p2 = corners[(side + 1) % 6];
  const center = {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  };
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
  return { center, angle };
}

// Reference to check if space is pressed (set by panZoom module)
let isSpacePressed = () => false;

function setSpacePressedCheck(fn) {
  isSpacePressed = fn;
}

// Generate the hex grid overlay
function generateHexGrid() {
  const svg = document.getElementById('hex-overlay');
  svg.innerHTML = '';
  svg.setAttribute('width', MAP_WIDTH);
  svg.setAttribute('height', MAP_HEIGHT);
  svg.setAttribute('viewBox', `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`);

  // Calculate grid dimensions based on map size
  const cols = Math.ceil(MAP_WIDTH / (HEX_SIZE * Math.sqrt(3))) + 2;
  const rows = Math.ceil(MAP_HEIGHT / (HEX_SIZE * 1.5)) + 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Convert offset coords to axial (odd-r offset)
      const q = col - Math.floor((row - (row & 1)) / 2);
      const r = row;
      const hex = new Hex(q, r);

      const center = hexToPixel(hex);

      // Skip hexes outside map bounds
      if (center.x < -HEX_SIZE || center.x > MAP_WIDTH + HEX_SIZE ||
          center.y < -HEX_SIZE || center.y > MAP_HEIGHT + HEX_SIZE) {
        continue;
      }

      const corners = getHexCorners(hex);
      const points = corners.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const hexKey = hex.toString();

      // Create hex polygon
      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('points', points);
      polygon.setAttribute('class', 'hex');
      polygon.setAttribute('data-hex', hexKey);
      polygon.setAttribute('data-q', hex.q);
      polygon.setAttribute('data-r', hex.r);

      polygon.addEventListener('click', (e) => {
        if (!isSpacePressed()) {
          e.stopPropagation();
          onHexClick(hex, polygon);
        }
      });

      svg.appendChild(polygon);

      // Create edge lines (6 sides)
      for (let side = 0; side < 6; side++) {
        const p1 = corners[side];
        const p2 = corners[(side + 1) % 6];
        const edgeKey = `${hexKey},${side}`;

        const edge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        edge.setAttribute('x1', p1.x.toFixed(1));
        edge.setAttribute('y1', p1.y.toFixed(1));
        edge.setAttribute('x2', p2.x.toFixed(1));
        edge.setAttribute('y2', p2.y.toFixed(1));
        edge.setAttribute('class', 'hex-edge');
        edge.setAttribute('data-edge', edgeKey);
        edge.setAttribute('data-hex', hexKey);
        edge.setAttribute('data-side', side);

        edge.addEventListener('click', (e) => {
          if (!isSpacePressed()) {
            e.stopPropagation();
            onEdgeClick(hex, side, edge);
          }
        });

        svg.appendChild(edge);
      }
    }
  }
}

// Hex click handler
function onHexClick(hex, element) {
  const hexKey = hex.toString();

  if (isLandMode()) {
    // Toggle land assignment
    if (GameState.land[hexKey] === getCurrentTeam()) {
      // Remove land if clicking same team
      delete GameState.land[hexKey];
      element.style.fill = '';
      element.style.stroke = '';
      console.log(`Land removed: ${hexKey}`);
    } else {
      // Assign land to current team
      const teamId = getCurrentTeam();
      GameState.land[hexKey] = teamId;
      const team = GameState.teams[teamId];
      element.style.fill = team.color;
      element.style.stroke = team.border;
      console.log(`Land assigned: ${hexKey} -> Team ${teamId}`);
    }
  } else {
    // Default: toggle selection
    element.classList.toggle('selected');
    console.log('Hex clicked:', hexKey);
  }
}

// Edge click handler
function onEdgeClick(hex, side, element) {
  const edgeKey = `${hex.toString()},${side}`;
  console.log('Edge clicked:', edgeKey);

  // Toggle selection visual
  element.classList.toggle('selected');
}

// Apply land color to hex element
function applyLandColor(hexKey, teamId) {
  const element = document.querySelector(`[data-hex="${hexKey}"]`);
  if (element && GameState.teams[teamId]) {
    const team = GameState.teams[teamId];
    element.style.fill = team.color;
    element.style.stroke = team.border;
  }
}

// Clear land color from hex
function clearLandColor(hexKey) {
  const element = document.querySelector(`[data-hex="${hexKey}"]`);
  if (element) {
    element.style.fill = '';
    element.style.stroke = '';
  }
}

// Render all land ownership from GameState
function renderLand() {
  // Clear all land colors first
  document.querySelectorAll('.hex').forEach(hex => {
    hex.style.fill = '';
    hex.style.stroke = '';
  });

  // Apply land ownership colors
  for (const [hexKey, teamId] of Object.entries(GameState.land)) {
    applyLandColor(hexKey, teamId);
  }
}
