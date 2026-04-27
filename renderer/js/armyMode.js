// ============================================
// Army Mode Module
// ============================================

let armyMode = false;

// Army subtypes with stats
const ARMY_TYPES = {
  infantry:    { name: 'Infantry',      hp: 60,  atk: 15, def: 10, move: 2, range: 1, cost: 50,  aerial: false, canHitAerial: false },
  archer:      { name: 'Archer',        hp: 30,  atk: 25, def: 5,  move: 2, range: 3, cost: 75,  aerial: false, canHitAerial: true },
  knight:      { name: 'Knight',        hp: 80,  atk: 20, def: 20, move: 2, range: 1, cost: 100, aerial: false, canHitAerial: false },
  cavalry:     { name: 'Cavalry',       hp: 50,  atk: 20, def: 8,  move: 5, range: 1, cost: 100, aerial: false, canHitAerial: false },
  dragonrider: { name: 'Dragon Rider',  hp: 100, atk: 35, def: 15, move: 4, range: 2, cost: 200, aerial: true,  canHitAerial: true }
};

function isArmyMode() {
  return armyMode;
}

function setArmyMode(enabled) {
  armyMode = enabled;
  if (enabled) {
    showArmyHint();
  } else {
    hideArmyHint();
    closeArmyTypePanel();
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
// Army Type Selection Panel
// ============================================

let pendingArmyHex = null;
let pendingArmyTeam = null;

function showArmyTypePanel(hexKey, teamId) {
  closeArmyTypePanel();
  pendingArmyHex = hexKey;
  pendingArmyTeam = teamId;

  const panel = document.createElement('div');
  panel.id = 'army-type-panel';
  panel.className = 'fleet-passenger-panel';

  const title = document.createElement('div');
  title.className = 'fleet-passenger-title';
  title.textContent = 'Select Unit Type';
  panel.appendChild(title);

  const list = document.createElement('div');
  list.className = 'fleet-passenger-list';

  for (const [subtype, stats] of Object.entries(ARMY_TYPES)) {
    const item = document.createElement('button');
    item.className = 'fleet-passenger-item';

    const aerial = stats.aerial ? ' [Air]' : '';
    item.textContent = `${stats.name}${aerial} — HP:${stats.hp} ATK:${stats.atk} DEF:${stats.def} RNG:${stats.range} SPD:${stats.move} (${stats.cost}g)`;

    item.addEventListener('click', () => {
      closeArmyTypePanel();
      placeArmy(pendingArmyHex, pendingArmyTeam, subtype);
      showNotification(`${stats.name} placed!`);
      pendingArmyHex = null;
      pendingArmyTeam = null;
    });

    list.appendChild(item);
  }

  panel.appendChild(list);

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'fleet-passenger-cancel';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    closeArmyTypePanel();
    pendingArmyHex = null;
    pendingArmyTeam = null;
  });
  panel.appendChild(cancelBtn);

  document.body.appendChild(panel);
}

function closeArmyTypePanel() {
  const panel = document.getElementById('army-type-panel');
  if (panel) panel.remove();
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
    // Check terrain
    const obj = GameState.hexObjects[hexKey];
    if (obj) {
      showNotification('Hex is occupied', 'error');
      return;
    }
    if (isWaterHex(hexKey)) {
      showNotification('Cannot place army on water', 'error');
      return;
    }
    if (GameState.land[hexKey] !== currentTeam) {
      showNotification('Must place army on your land', 'error');
      return;
    }
    // Show type selection
    showArmyTypePanel(hexKey, currentTeam);
  }
}

function placeArmy(hexKey, teamId, subtype) {
  const stats = ARMY_TYPES[subtype];
  GameState.hexObjects[hexKey] = {
    type: 'army',
    subtype: subtype,
    teamId: teamId,
    health: stats.hp,
    maxHealth: stats.hp
  };

  console.log(`Placed ${stats.name} for team ${teamId} at ${hexKey}`);
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
      addArmyMarker(hexKey, obj.teamId, obj.subtype || 'infantry');
    }
  }
}

function addArmyMarker(hexKey, teamId, subtype) {
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

  // Army image — use subtype-specific icon
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'image');
  icon.setAttribute('x', centerX - iconSize / 2);
  icon.setAttribute('y', centerY - iconSize / 2);
  icon.setAttribute('width', iconSize);
  icon.setAttribute('height', iconSize);
  icon.setAttribute('href', `../assets/hex-objects/${subtype}.png`);
  icon.setAttribute('filter', `url(#${filterId})`);
  icon.classList.add('army-marker-icon');

  marker.appendChild(icon);
  svg.appendChild(marker);
}
