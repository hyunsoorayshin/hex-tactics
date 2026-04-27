// ============================================
// Building Mode Module (Town + Castle unified)
// ============================================

let buildingMode = false;

// Building interaction state
let buildingInteractionMode = null; // 'boarding' | 'disembarking' | null
let selectedBuildingHex = null;
let selectedBuildingDisembarkIndex = null;

const TOWN_CAPACITY = 3;
const CASTLE_CAPACITY = 5;

function isBuildingMode() {
  return buildingMode;
}

function setBuildingMode(enabled) {
  buildingMode = enabled;
  if (enabled) {
    showBuildingHint();
  } else {
    hideBuildingHint();
    clearBuildingInteraction();
  }
}

function toggleBuildingMode() {
  setBuildingMode(!buildingMode);
  return buildingMode;
}

function getBuildingInteractionMode() {
  return buildingInteractionMode;
}

function clearBuildingInteraction() {
  buildingInteractionMode = null;
  selectedBuildingHex = null;
  selectedBuildingDisembarkIndex = null;
  closeBuildingPassengerPanel();
  updateBuildingHint();
  renderTowns();
  renderCastles();
}

// ============================================
// Building Hint UI
// ============================================

function showBuildingHint() {
  let hint = document.getElementById('building-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'building-hint';
    hint.className = 'mode-hint';
    document.body.appendChild(hint);
  }
  updateBuildingHint();
  hint.classList.add('visible');
}

function hideBuildingHint() {
  const hint = document.getElementById('building-hint');
  if (hint) {
    hint.classList.remove('visible');
  }
}

function updateBuildingHint() {
  const hint = document.getElementById('building-hint');
  if (!hint) return;

  if (buildingInteractionMode === 'boarding') {
    hint.textContent = 'Click a player to board';
    hint.classList.add('interaction');
  } else if (buildingInteractionMode === 'disembarking') {
    hint.textContent = 'Click a hex to place the passenger';
    hint.classList.add('interaction');
  } else {
    hint.textContent = 'Click land to place town. Click town to upgrade. Shift: board | Option: disembark | Cmd: remove';
    hint.classList.remove('interaction');
  }
}

// ============================================
// Hex Ring Calculations
// ============================================

// Get the outer ring of 12 hexes (2 steps away from center)
function getOuterRing(hexKey) {
  const [q, r] = hexKey.split(',').map(Number);
  const outerHexes = [];

  // For pointy-top hex, the outer ring at distance 2 has 12 hexes
  // Using axial coordinate system
  for (let i = 0; i < 6; i++) {
    // Direction vectors for hex
    const directions = [
      [1, 0], [1, -1], [0, -1],
      [-1, 0], [-1, 1], [0, 1]
    ];

    // Get the hex 2 steps in direction i
    const dq = directions[i][0] * 2;
    const dr = directions[i][1] * 2;
    outerHexes.push(new Hex(q + dq, r + dr));

    // Get the hex between direction i and i+1 (at distance 2)
    const nextI = (i + 1) % 6;
    const midQ = directions[i][0] + directions[nextI][0];
    const midR = directions[i][1] + directions[nextI][1];
    outerHexes.push(new Hex(q + midQ, r + midR));
  }

  return outerHexes;
}

// Get all 19 hexes for a castle (center + inner 6 + outer 12)
function getCastleHexes(hexKey) {
  const innerHexes = getHexAndNeighbors(hexKey); // 7 hexes (center + 6)
  const outerHexes = getOuterRing(hexKey); // 12 hexes
  return { inner: innerHexes, outer: outerHexes, all: [...innerHexes, ...outerHexes] };
}

// ============================================
// Town Placement Logic
// ============================================

function canPlaceTown(hexKey, teamId) {
  // Get center hex and all 6 neighbors
  const hexes = getHexAndNeighbors(hexKey);

  // Check if all 7 hexes are owned by this team
  for (const hex of hexes) {
    const key = hex.toString();
    if (GameState.land[key] !== teamId) {
      return { valid: false, reason: 'All 7 hexes must be your land' };
    }
  }

  // Check if any of these hexes already have a town or castle
  for (const hex of hexes) {
    const key = hex.toString();
    const obj = GameState.hexObjects[key];
    if (obj && (obj.type === 'town' || obj.type === 'town-territory' ||
                obj.type === 'castle' || obj.type === 'castle-territory')) {
      return { valid: false, reason: 'Cannot overlap with existing town or castle' };
    }
  }

  return { valid: true };
}

function placeTown(hexKey, teamId) {
  // Store town in game state (center hex)
  GameState.hexObjects[hexKey] = {
    type: 'town',
    teamId: teamId,
    health: OBJECT_HEALTH.town,
    maxHealth: OBJECT_HEALTH.town,
    passengers: []
  };

  // Mark all 6 neighbor hexes as town territory
  const hexes = getHexAndNeighbors(hexKey);
  for (const hex of hexes) {
    const key = hex.toString();
    if (key !== hexKey) {
      GameState.hexObjects[key] = {
        type: 'town-territory',
        teamId: teamId,
        centerHex: hexKey
      };
    }
  }

  console.log(`Placed town for team ${teamId} at ${hexKey}`);
  renderTowns();
}

function removeTown(hexKey) {
  const obj = GameState.hexObjects[hexKey];
  if (!obj) return;

  // If this is the center, remove the town and all territory
  if (obj.type === 'town') {
    // Evict all passengers first
    evictFromTown(hexKey);
    const hexes = getHexAndNeighbors(hexKey);
    for (const hex of hexes) {
      delete GameState.hexObjects[hex.toString()];
    }
  }
  // If this is territory, find and remove the whole town
  else if (obj.type === 'town-territory') {
    removeTown(obj.centerHex);
    return;
  }

  renderTowns();
}

function evictFromTown(hexKey) {
  const town = GameState.hexObjects[hexKey];
  if (!town?.passengers || town.passengers.length === 0) return;

  for (const passenger of town.passengers) {
    GameState.setPlayerPosition(passenger.teamId, passenger.playerId, null);
  }
  town.passengers = [];
}

// ============================================
// Castle Placement Logic
// ============================================

function canPlaceCastle(hexKey, teamId) {
  // Check if there's a town at this hex
  const centerObj = GameState.hexObjects[hexKey];
  if (!centerObj || centerObj.type !== 'town') {
    return { valid: false, reason: 'Must upgrade from an existing town' };
  }

  // Check if town belongs to this team
  if (centerObj.teamId !== teamId) {
    return { valid: false, reason: 'Can only upgrade your own town' };
  }

  // Get all 19 hexes needed
  const { inner, outer, all } = getCastleHexes(hexKey);

  // Check if all 19 hexes are owned by this team
  for (const hex of all) {
    const key = hex.toString();
    if (GameState.land[key] !== teamId) {
      return { valid: false, reason: 'All 19 hexes must be your land' };
    }
  }

  // Check if outer ring hexes are free (inner ring is town territory, that's ok)
  for (const hex of outer) {
    const key = hex.toString();
    const obj = GameState.hexObjects[key];
    if (obj && obj.type !== 'town-territory' && obj.centerHex !== hexKey) {
      // Allow town-territory that belongs to this town
      if (obj.type === 'castle' || obj.type === 'castle-territory' ||
          obj.type === 'town' || obj.type === 'town-territory') {
        return { valid: false, reason: 'Cannot overlap with other structures' };
      }
    }
  }

  return { valid: true };
}

function placeCastle(hexKey, teamId) {
  // Get all hexes
  const { inner, outer } = getCastleHexes(hexKey);

  // Remove existing town and its territory first
  for (const hex of inner) {
    const key = hex.toString();
    if (GameState.hexObjects[key]?.type === 'town' ||
        GameState.hexObjects[key]?.type === 'town-territory') {
      delete GameState.hexObjects[key];
    }
  }

  // Store castle in game state (center hex)
  GameState.hexObjects[hexKey] = {
    type: 'castle',
    teamId: teamId,
    health: OBJECT_HEALTH.castle,
    maxHealth: OBJECT_HEALTH.castle,
    passengers: []
  };

  // Mark inner ring (6 hexes) as castle territory
  for (const hex of inner) {
    const key = hex.toString();
    if (key !== hexKey) {
      GameState.hexObjects[key] = {
        type: 'castle-territory',
        teamId: teamId,
        centerHex: hexKey,
        ring: 'inner'
      };
    }
  }

  // Mark outer ring (12 hexes) as castle territory
  for (const hex of outer) {
    const key = hex.toString();
    GameState.hexObjects[key] = {
      type: 'castle-territory',
      teamId: teamId,
      centerHex: hexKey,
      ring: 'outer'
    };
  }

  console.log(`Placed castle for team ${teamId} at ${hexKey}`);
  renderCastles();
  renderTowns(); // Re-render towns to remove the upgraded one
}

function removeCastle(hexKey) {
  const obj = GameState.hexObjects[hexKey];
  if (!obj) return;

  // If this is the center, remove the castle and all territory
  if (obj.type === 'castle') {
    // Evict all passengers first
    evictFromCastle(hexKey);

    const { all } = getCastleHexes(hexKey);
    for (const hex of all) {
      delete GameState.hexObjects[hex.toString()];
    }
  }
  // If this is territory, find and remove the whole castle
  else if (obj.type === 'castle-territory') {
    removeCastle(obj.centerHex);
    return;
  }

  renderCastles();
}

function evictFromCastle(hexKey) {
  const castle = GameState.hexObjects[hexKey];
  if (!castle?.passengers || castle.passengers.length === 0) return;

  for (const passenger of castle.passengers) {
    if (passenger.kind === 'player') {
      // Player loses their position (will need to be placed again)
      GameState.setPlayerPosition(passenger.teamId, passenger.playerId, null);
    }
  }
  castle.passengers = [];
}

// ============================================
// Unified Building Click Handler
// ============================================

function onBuildingModeHexClick(hexKey, element, shiftKey, metaKey, altKey) {
  if (buildingInteractionMode === 'boarding') {
    handleBuildingBoarding(hexKey);
    return;
  }

  if (buildingInteractionMode === 'disembarking') {
    handleBuildingDisembarking(hexKey);
    return;
  }

  const currentTeam = getCurrentTeam();
  const existingObj = GameState.hexObjects[hexKey];

  // Handle existing buildings
  if (existingObj?.type === 'town' || existingObj?.type === 'castle' ||
      existingObj?.type === 'town-territory' || existingObj?.type === 'castle-territory') {
    // Find center hex
    const centerHex = (existingObj.type === 'town' || existingObj.type === 'castle') ? hexKey : existingObj.centerHex;
    const building = GameState.hexObjects[centerHex];

    if (shiftKey) {
      // Board -- check capacity based on type
      const capacity = building.type === 'castle' ? CASTLE_CAPACITY : TOWN_CAPACITY;
      const passengers = building.passengers || [];
      if (passengers.length >= capacity) {
        showNotification(`${building.type === 'castle' ? 'Castle' : 'Town'} is full (${capacity}/${capacity})!`, 'error');
      } else {
        selectedBuildingHex = centerHex;
        buildingInteractionMode = 'boarding';
        showNotification(`Select a player to board (${passengers.length}/${capacity})`);
        updateBuildingHint();
        renderTowns();
        renderCastles();
      }
    } else if (altKey) {
      // Disembark -- show panel
      const passengers = building.passengers || [];
      if (passengers.length === 0) {
        showNotification('No passengers to disembark', 'error');
      } else {
        selectedBuildingHex = centerHex;
        showBuildingPassengerPanel(centerHex, passengers);
        renderTowns();
        renderCastles();
      }
    } else if (metaKey) {
      // Remove -- check passengers first
      const passengers = building.passengers || [];
      if (passengers.length > 0) {
        showNotification('Disembark all passengers first!', 'error');
      } else {
        if (building.type === 'castle') {
          removeCastle(centerHex);
          showNotification('Castle removed');
        } else {
          removeTown(centerHex);
          showNotification('Town removed');
        }
      }
    } else if (building.type === 'town') {
      // Try upgrade to castle
      const result = canPlaceCastle(centerHex, currentTeam);
      if (result.valid) {
        placeCastle(centerHex, currentTeam);
        showNotification('Town upgraded to Castle!');
      } else {
        showNotification(result.reason, 'error');
      }
    } else {
      showNotification('Shift: board | Option: disembark | Cmd: remove', 'error');
    }
    return;
  }

  // Place new town
  const result = canPlaceTown(hexKey, currentTeam);
  if (result.valid) {
    placeTown(hexKey, currentTeam);
    showNotification('Town placed!');
  } else {
    showNotification(result.reason, 'error');
  }
}

// ============================================
// Building Boarding / Disembarking
// ============================================

function handleBuildingBoarding(hexKey) {
  const building = GameState.hexObjects[selectedBuildingHex];
  if (!building || (building.type !== 'town' && building.type !== 'castle')) {
    showNotification('Building not found', 'error');
    clearBuildingInteraction();
    return;
  }

  if (!building.passengers) building.passengers = [];

  const capacity = building.type === 'castle' ? CASTLE_CAPACITY : TOWN_CAPACITY;
  const buildingName = building.type === 'castle' ? 'Castle' : 'Town';

  if (building.passengers.length >= capacity) {
    showNotification(`${buildingName} is full (${capacity}/${capacity})!`, 'error');
    clearBuildingInteraction();
    return;
  }

  // Check for player at hex
  const playersAtHex = GameState.getPlayersAtHex(hexKey);
  if (playersAtHex.length > 0) {
    const { teamId, playerId, player } = playersAtHex[0];
    building.passengers.push({
      kind: 'player',
      teamId: teamId,
      playerId: playerId,
      name: player.name
    });

    // Remove player from their hex position
    GameState.setPlayerPosition(teamId, playerId, null);

    // Heal player to full health
    const stats = getPlayerStats(getEffectiveGold(player));
    player.health = stats.health;
    player.maxHealth = stats.health;

    // Revive dead players
    if (player.isDead) {
      player.isDead = false;
      player.revives = (player.revives || 0) + 1;
      const team = GameState.teams[teamId];
      if (team) {
        team.reviveCount = (team.reviveCount || 0) + 1;
      }
      showNotification(`${player.name} revived and boarded the ${buildingName.toLowerCase()}! (-${REVIVE_COST}g, ${building.passengers.length}/${capacity})`);
    } else {
      showNotification(`${player.name} boarded the ${buildingName.toLowerCase()} (healed to full)! (${building.passengers.length}/${capacity})`);
    }

    if (building.passengers.length < capacity) {
      updateBuildingHint();
    } else {
      clearBuildingInteraction();
    }

    renderTowns();
    renderCastles();
    renderPlayerMarkers();
    renderAllHealthBars();
    return;
  }

  showNotification('No player at this hex', 'error');
}

function handleBuildingDisembarking(hexKey) {
  const building = GameState.hexObjects[selectedBuildingHex];
  if (!building || (building.type !== 'town' && building.type !== 'castle') ||
      !building.passengers || building.passengers.length === 0) {
    showNotification('No passengers to disembark', 'error');
    clearBuildingInteraction();
    return;
  }

  if (selectedBuildingDisembarkIndex === null) {
    showNotification('Select a passenger from the panel first', 'error');
    return;
  }

  const passenger = building.passengers.splice(selectedBuildingDisembarkIndex, 1)[0];

  GameState.setPlayerPosition(passenger.teamId, passenger.playerId, hexKey);
  showNotification(`${passenger.name} disembarked!`);

  clearBuildingInteraction();

  renderTowns();
  renderCastles();
  renderPlayerMarkers();
  renderAllHealthBars();
}

// ============================================
// Building Passenger Selection Panel
// ============================================

function showBuildingPassengerPanel(hexKey, passengers) {
  closeBuildingPassengerPanel();

  const panel = document.createElement('div');
  panel.id = 'building-passenger-panel';
  panel.className = 'fleet-passenger-panel';

  const title = document.createElement('div');
  title.className = 'fleet-passenger-title';
  title.textContent = `Disembark (${passengers.length} aboard)`;
  panel.appendChild(title);

  const list = document.createElement('div');
  list.className = 'fleet-passenger-list';

  passengers.forEach((p, index) => {
    const item = document.createElement('button');
    item.className = 'fleet-passenger-item';

    const icon = '\u2694';
    const label = p.name;
    item.textContent = `${icon} ${label}`;

    item.addEventListener('click', () => {
      selectedBuildingDisembarkIndex = index;
      selectedBuildingHex = hexKey;
      buildingInteractionMode = 'disembarking';
      closeBuildingPassengerPanel();
      showNotification(`Click a hex to place ${label}`);
      updateBuildingHint();
      renderTowns();
      renderCastles();
    });

    list.appendChild(item);
  });

  panel.appendChild(list);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fleet-passenger-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    clearBuildingInteraction();
  });
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
}

function closeBuildingPassengerPanel() {
  const panel = document.getElementById('building-passenger-panel');
  if (panel) panel.remove();
}

// ============================================
// Town Rendering
// ============================================

function renderTowns() {
  // Remove existing town markers
  document.querySelectorAll('.town-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="town-outline-"]').forEach(f => f.remove());

  // Find all towns (center hexes only)
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'town') {
      const isSelected = hexKey === selectedBuildingHex;
      addTownMarker(hexKey, obj.teamId, obj.passengers || [], isSelected);
    }
  }
}

function addTownMarker(hexKey, teamId, passengers, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  const iconSize = ICON_SIZE.town;

  const svg = document.getElementById('hex-overlay');

  // Create marker group
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('town-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Click handler - delegate to appropriate mode
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    if (isLandMode()) {
      onLandClick(hexKey, document.querySelector(`.hex[data-hex="${hexKey}"]`));
      return;
    }
    if (buildingInteractionMode === 'boarding') {
      handleBuildingBoarding(hexKey);
      return;
    }
    if (buildingInteractionMode === 'disembarking') {
      handleBuildingDisembarking(hexKey);
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
    if (isPlayerMode()) {
      onPlayerModeHexClick(hexKey, null);
      return;
    }
    if (isBuildingMode()) {
      onBuildingModeHexClick(hexKey, null, e.shiftKey, metaKey, e.altKey);
    }
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

  // Passenger count badge (bottom-right)
  const count = passengers.length;
  if (count > 0) {
    const badgeX = centerX + iconSize / 2 - 6;
    const badgeY = centerY + iconSize / 2 + 2;

    const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeBg.setAttribute('x', badgeX - 6);
    badgeBg.setAttribute('y', badgeY - 10);
    badgeBg.setAttribute('width', 16);
    badgeBg.setAttribute('height', 14);
    badgeBg.setAttribute('rx', 3);
    badgeBg.setAttribute('fill', 'rgba(0, 0, 0, 0.85)');
    badgeBg.setAttribute('stroke', teamColor);
    badgeBg.setAttribute('stroke-width', 1);

    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', badgeX + 2);
    badgeText.setAttribute('y', badgeY);
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.setAttribute('fill', '#fff');
    badgeText.setAttribute('font-size', '10');
    badgeText.setAttribute('font-weight', 'bold');
    badgeText.textContent = count;

    marker.appendChild(badgeBg);
    marker.appendChild(badgeText);
  }

  // Passenger names label
  if (count > 0) {
    const names = passengers.map(p => p.name).join(', ');
    const displayText = names.length > 30 ? names.substring(0, 27) + '...' : names;
    const nameWidth = displayText.length * 6 + 8;

    const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nameBg.setAttribute('x', centerX - nameWidth / 2);
    nameBg.setAttribute('y', centerY - iconSize / 2 - 20);
    nameBg.setAttribute('width', nameWidth);
    nameBg.setAttribute('height', 14);
    nameBg.setAttribute('rx', 3);
    nameBg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    nameBg.setAttribute('stroke', teamColor);
    nameBg.setAttribute('stroke-width', 1);

    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', centerX);
    nameText.setAttribute('y', centerY - iconSize / 2 - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('fill', '#fff');
    nameText.setAttribute('font-size', '10');
    nameText.classList.add('town-passenger-names');
    nameText.textContent = displayText;

    marker.appendChild(nameBg);
    marker.appendChild(nameText);
  }

  // Add selected indicator
  if (isSelected) {
    const selectRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    selectRing.setAttribute('cx', centerX);
    selectRing.setAttribute('cy', centerY);
    selectRing.setAttribute('r', iconSize / 2 + 8);
    selectRing.setAttribute('fill', 'none');
    selectRing.setAttribute('stroke', '#ffff00');
    selectRing.setAttribute('stroke-width', 2);
    selectRing.setAttribute('stroke-dasharray', '5,3');
    selectRing.classList.add('town-select-ring');
    marker.insertBefore(selectRing, marker.firstChild);
  }

  svg.appendChild(marker);
}

// ============================================
// Castle Rendering
// ============================================

function renderCastles() {
  // Remove existing castle markers
  document.querySelectorAll('.castle-marker').forEach(m => m.remove());
  document.querySelectorAll('[id^="castle-outline-"]').forEach(f => f.remove());

  // Find all castles (center hexes only)
  for (const [hexKey, obj] of Object.entries(GameState.hexObjects)) {
    if (obj.type === 'castle') {
      const isSelected = hexKey === selectedBuildingHex;
      addCastleMarker(hexKey, obj.teamId, obj.passengers || [], isSelected);
    }
  }
}

function addCastleMarker(hexKey, teamId, passengers, isSelected) {
  const hexEl = document.querySelector(`[data-hex="${hexKey}"]`);
  if (!hexEl) return;

  const team = GameState.teams[teamId];
  const teamColor = team?.outline || team?.border || '#ffffff';

  // Get hex center position
  const bbox = hexEl.getBBox();
  const centerX = bbox.x + bbox.width / 2;
  const centerY = bbox.y + bbox.height / 2;

  // Castle icon size (spans multiple hexes, so larger)
  const iconSize = ICON_SIZE.castle;
  const iconX = centerX - iconSize / 2;
  const iconY = centerY - iconSize / 2;

  const svg = document.getElementById('hex-overlay');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  marker.classList.add('castle-marker');
  marker.setAttribute('data-hex', hexKey);
  marker.setAttribute('data-team', teamId);

  // Click handler - delegate to appropriate mode
  marker.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaKey = e.metaKey || e.ctrlKey;

    if (isLandMode()) {
      onLandClick(hexKey, document.querySelector(`.hex[data-hex="${hexKey}"]`));
      return;
    }
    if (buildingInteractionMode === 'boarding') {
      handleBuildingBoarding(hexKey);
      return;
    }
    if (buildingInteractionMode === 'disembarking') {
      handleBuildingDisembarking(hexKey);
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
    if (isPlayerMode()) {
      onPlayerModeHexClick(hexKey, null);
      return;
    }
    if (isBuildingMode()) {
      onBuildingModeHexClick(hexKey, null, e.shiftKey, metaKey, e.altKey);
    }
  });

  // Create SVG filter for team color outline
  const filterId = `castle-outline-${hexKey.replace(',', '-')}`;
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

  // Castle image
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', iconX);
  icon.setAttribute('y', iconY);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/castle${teamId === 0 ? 10 : teamId}.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('castle-marker-icon');

  marker.appendChild(icon);

  // Passenger count badge
  const count = passengers.length;
  if (count > 0) {
    const badgeX = centerX + iconSize / 2 - 6;
    const badgeY = centerY + iconSize / 2 + 2;

    const badgeBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    badgeBg.setAttribute('x', badgeX - 6);
    badgeBg.setAttribute('y', badgeY - 10);
    badgeBg.setAttribute('width', 16);
    badgeBg.setAttribute('height', 14);
    badgeBg.setAttribute('rx', 3);
    badgeBg.setAttribute('fill', 'rgba(0, 0, 0, 0.85)');
    badgeBg.setAttribute('stroke', teamColor);
    badgeBg.setAttribute('stroke-width', 1);

    const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    badgeText.setAttribute('x', badgeX + 2);
    badgeText.setAttribute('y', badgeY);
    badgeText.setAttribute('text-anchor', 'middle');
    badgeText.setAttribute('fill', '#fff');
    badgeText.setAttribute('font-size', '10');
    badgeText.setAttribute('font-weight', 'bold');
    badgeText.textContent = count;

    marker.appendChild(badgeBg);
    marker.appendChild(badgeText);
  }

  // Passenger names label
  if (count > 0) {
    const names = passengers.map(p => p.name).join(', ');
    const displayText = names.length > 30 ? names.substring(0, 27) + '...' : names;
    const nameWidth = displayText.length * 6 + 8;

    const nameBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nameBg.setAttribute('x', centerX - nameWidth / 2);
    nameBg.setAttribute('y', centerY - iconSize / 2 - 20);
    nameBg.setAttribute('width', nameWidth);
    nameBg.setAttribute('height', 14);
    nameBg.setAttribute('rx', 3);
    nameBg.setAttribute('fill', 'rgba(0, 0, 0, 0.8)');
    nameBg.setAttribute('stroke', teamColor);
    nameBg.setAttribute('stroke-width', 1);

    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('x', centerX);
    nameText.setAttribute('y', centerY - iconSize / 2 - 8);
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('fill', '#fff');
    nameText.setAttribute('font-size', '10');
    nameText.classList.add('castle-passenger-names');
    nameText.textContent = displayText;

    marker.appendChild(nameBg);
    marker.appendChild(nameText);
  }

  // Add selected indicator
  if (isSelected) {
    const selectRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    selectRing.setAttribute('cx', centerX);
    selectRing.setAttribute('cy', centerY);
    selectRing.setAttribute('r', iconSize / 2 + 8);
    selectRing.setAttribute('fill', 'none');
    selectRing.setAttribute('stroke', '#ffff00');
    selectRing.setAttribute('stroke-width', 2);
    selectRing.setAttribute('stroke-dasharray', '5,3');
    selectRing.classList.add('castle-select-ring');
    marker.insertBefore(selectRing, marker.firstChild);
  }

  svg.appendChild(marker);
}
