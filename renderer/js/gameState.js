// ============================================
// Game State Module
// ============================================

// Object health values (tuned for faster gameplay)
const OBJECT_HEALTH = {
  bridge: 40,
  wall: 50,
  ship: 60,
  town: 120,
  army: 100,
  castle: 350  // Requires 4-5 King attacks (80 dmg each)
};

// Object costs (gold)
const OBJECT_COSTS = {
  wall: 25,
  bridge: 50,
  ship: 75,
  army: 100,
  town: 1000,
  castle: 5000
};

// Icon sizes: small=34, medium=48, large=64, xlarge=100
const ICON_SIZE_SMALL = 34;
const ICON_SIZE_MEDIUM = 48;
const ICON_SIZE_LARGE = 64;
const ICON_SIZE_XLARGE = 100;

const ICON_SIZE = {
  player: ICON_SIZE_SMALL,
  army: ICON_SIZE_SMALL,
  ship: ICON_SIZE_SMALL,
  bridge: ICON_SIZE_MEDIUM,
  town: ICON_SIZE_LARGE,
  castle: ICON_SIZE_XLARGE
};

// Health bar offset: 5px below bottom edge of centered icon
const HEALTH_BAR_GAP = 5;
function getHealthBarOffset(type) {
  return (ICON_SIZE[type] || 32) / 2 + HEALTH_BAR_GAP;
}

// Honor/Dishonor gold modifier per point
const HONOR_GOLD = 50;

// Get effective gold: base gold + honor bonuses - dishonor penalties
function getEffectiveGold(player) {
  const base = player.gold || 0;
  const honorBonus = (player.honor || 0) * HONOR_GOLD;
  const dishonorPenalty = (player.dishonor || 0) * HONOR_GOLD;
  return Math.max(0, base + honorBonus - dishonorPenalty);
}

// Revive cost per player
const REVIVE_COST = 10;

// Current team selection
let currentTeam = 1;

// Game State Object
const GameState = {
  // Objects placed on hexes: { "q,r": { type: "category/name", data: {} } }
  hexObjects: {},

  // Objects placed on edges: { "q,r,side": { type: "category/name", data: {} } }
  edgeObjects: {},

  // Land ownership: { "q,r": teamId }
  land: {},

  // Attack placements: { id: { from: "q,r", to: "q,r", data: {} } }
  attacks: {},

  // Teams data: { teamId: { name, color, border, players, objectsLost: { type: count }, reviveCount } }
  teams: {
    1: { name: 'Team 1', color: 'rgba(255, 0, 0, 0.25)', border: 'rgba(255, 0, 0, 0.3)', outline: '#ff0000', players: {}, objectsLost: {}, reviveCount: 0 },
    2: { name: 'Team 2', color: 'rgba(0, 102, 255, 0.25)', border: 'rgba(0, 102, 255, 0.3)', outline: '#0066ff', players: {}, objectsLost: {}, reviveCount: 0 },
    3: { name: 'Team 3', color: 'rgba(0, 204, 0, 0.25)', border: 'rgba(0, 204, 0, 0.3)', outline: '#00cc00', players: {}, objectsLost: {}, reviveCount: 0 },
    4: { name: 'Team 4', color: 'rgba(255, 221, 0, 0.25)', border: 'rgba(255, 221, 0, 0.3)', outline: '#ffdd00', players: {}, objectsLost: {}, reviveCount: 0 },
    5: { name: 'Team 5', color: 'rgba(204, 0, 204, 0.25)', border: 'rgba(204, 0, 204, 0.3)', outline: '#cc00cc', players: {}, objectsLost: {}, reviveCount: 0 },
    6: { name: 'Team 6', color: 'rgba(0, 204, 204, 0.25)', border: 'rgba(0, 204, 204, 0.3)', outline: '#00cccc', players: {}, objectsLost: {}, reviveCount: 0 },
    7: { name: 'Team 7', color: 'rgba(255, 136, 0, 0.25)', border: 'rgba(255, 136, 0, 0.3)', outline: '#ff8800', players: {}, objectsLost: {}, reviveCount: 0 },
    8: { name: 'Team 8', color: 'rgba(170, 102, 51, 0.25)', border: 'rgba(170, 102, 51, 0.3)', outline: '#aa6633', players: {}, objectsLost: {}, reviveCount: 0 },
    9: { name: 'Team 9', color: 'rgba(255, 68, 136, 0.25)', border: 'rgba(255, 68, 136, 0.3)', outline: '#ff4488', players: {}, objectsLost: {}, reviveCount: 0 },
    0: { name: 'Team 10', color: 'rgba(136, 170, 0, 0.25)', border: 'rgba(136, 170, 0, 0.3)', outline: '#88aa00', players: {}, objectsLost: {}, reviveCount: 0 }
  },

  // Export state for saving
  toJSON() {
    return {
      hexObjects: this.hexObjects,
      edgeObjects: this.edgeObjects,
      land: this.land,
      attacks: this.attacks,
      teams: this.teams
    };
  },

  // Import state from save
  fromJSON(data) {
    if (!data) return;
    this.hexObjects = data.hexObjects || {};
    this.edgeObjects = data.edgeObjects || {};
    this.land = data.land || {};
    this.attacks = data.attacks || {};
    if (data.teams) {
      this.teams = data.teams;
    }
  },

  // Clear all state
  clear() {
    this.hexObjects = {};
    this.edgeObjects = {};
    this.land = {};
    this.attacks = {};
    // Reset teams to default
    for (let i = 0; i <= 9; i++) {
      const key = i === 10 ? 0 : i;
      this.teams[key] = { name: `Team ${i === 0 ? 10 : i}`, players: {}, objectsLost: {}, reviveCount: 0 };
    }
  },

  // Get team's total land count
  getTeamLandCount(teamId) {
    return Object.values(this.land).filter(t => t === teamId).length;
  },

  // Get team's total gold (sum of all player effective gold) - this is merit points
  getTeamGold(teamId) {
    const team = this.teams[teamId];
    if (!team || !team.players) return 0;
    return Object.values(team.players).reduce((sum, p) => sum + getEffectiveGold(p), 0);
  },

  // Get cost of team's currently placed objects
  getTeamObjectsCost(teamId) {
    let cost = 0;
    // Count hex objects
    for (const obj of Object.values(this.hexObjects)) {
      if (obj.teamId === teamId && OBJECT_COSTS[obj.type]) {
        cost += OBJECT_COSTS[obj.type];
      }
    }
    // Count edge objects
    for (const obj of Object.values(this.edgeObjects)) {
      if (obj.teamId === teamId && OBJECT_COSTS[obj.type]) {
        cost += OBJECT_COSTS[obj.type];
      }
    }
    return cost;
  },

  // Get cost of team's lost objects
  getTeamLostObjectsCost(teamId) {
    const team = this.teams[teamId];
    if (!team || !team.objectsLost) return 0;
    let cost = 0;
    for (const [type, count] of Object.entries(team.objectsLost)) {
      if (OBJECT_COSTS[type]) {
        cost += OBJECT_COSTS[type] * count;
      }
    }
    return cost;
  },

  // Get team's revive costs
  getTeamReviveCost(teamId) {
    const team = this.teams[teamId];
    if (!team) return 0;
    return (team.reviveCount || 0) * REVIVE_COST;
  },

  // Get team's available gold (merit points - all costs)
  getTeamAvailableGold(teamId) {
    const meritPoints = this.getTeamGold(teamId);
    const objectsCost = this.getTeamObjectsCost(teamId);
    const lostCost = this.getTeamLostObjectsCost(teamId);
    const reviveCost = this.getTeamReviveCost(teamId);
    return meritPoints - objectsCost - lostCost - reviveCost;
  },

  // Get team's asset counts
  getTeamAssets(teamId) {
    const assets = { hexObjects: 0, edgeObjects: 0 };
    // Count hex objects belonging to this team
    for (const obj of Object.values(this.hexObjects)) {
      if (obj.teamId === teamId) assets.hexObjects++;
    }
    // Count edge objects belonging to this team
    for (const obj of Object.values(this.edgeObjects)) {
      if (obj.teamId === teamId) assets.edgeObjects++;
    }
    return assets;
  },

  // Add player to team
  addPlayer(teamId, playerId, name, gold = 0) {
    if (!this.teams[teamId]) return;
    this.teams[teamId].players[playerId] = {
      name,
      gold,
      position: null,
      kills: 0,
      deaths: 0,
      revives: 0
    };
  },

  // Update player gold
  setPlayerGold(teamId, playerId, gold) {
    if (this.teams[teamId]?.players[playerId]) {
      this.teams[teamId].players[playerId].gold = gold;
    }
  },

  // Set player position on map
  setPlayerPosition(teamId, playerId, hexKey) {
    if (this.teams[teamId]?.players[playerId]) {
      this.teams[teamId].players[playerId].position = hexKey;
    }
  },

  // Get player by ID (searches all teams)
  getPlayer(playerId) {
    for (const [teamId, team] of Object.entries(this.teams)) {
      if (team.players[playerId]) {
        return { teamId: parseInt(teamId), player: team.players[playerId] };
      }
    }
    return null;
  },

  // Get all players at a hex position
  getPlayersAtHex(hexKey) {
    const players = [];
    for (const [teamId, team] of Object.entries(this.teams)) {
      for (const [playerId, player] of Object.entries(team.players)) {
        if (player.position === hexKey) {
          players.push({ teamId: parseInt(teamId), playerId, player });
        }
      }
    }
    return players;
  },

  // Transfer player to another team (preserves all stats)
  transferPlayer(fromTeamId, toTeamId, playerId) {
    const player = this.teams[fromTeamId]?.players[playerId];
    if (!player || !this.teams[toTeamId]) return false;

    // Remove from map if placed
    if (player.position) {
      for (const obj of Object.values(this.hexObjects)) {
        if (obj.passenger && obj.passenger.playerId === playerId && obj.passenger.teamId === fromTeamId) {
          delete obj.passenger;
        }
        if (obj.housed && obj.housed.playerId === playerId && obj.housed.teamId === fromTeamId) {
          delete obj.housed;
        }
      }
      player.position = null;
    }

    this.teams[toTeamId].players[playerId] = player;
    delete this.teams[fromTeamId].players[playerId];
    return true;
  },

  // Remove player from team
  removePlayer(teamId, playerId) {
    if (this.teams[teamId]?.players[playerId]) {
      delete this.teams[teamId].players[playerId];
    }
  }
};

// Mode getters/setters
function getCurrentTeam() {
  return currentTeam;
}

function setCurrentTeam(teamId) {
  if (GameState.teams.hasOwnProperty(teamId)) {
    currentTeam = teamId;
    return true;
  }
  return false;
}
