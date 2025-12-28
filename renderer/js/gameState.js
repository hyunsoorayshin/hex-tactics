// ============================================
// Game State Module
// ============================================

// Object health values
const OBJECT_HEALTH = {
  bridge: 75,
  wall: 100,
  ship: 100,
  town: 150,
  army: 250,
  castle: 500
};

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

  // Teams data: { teamId: { name, color, border, players, objectsLost } }
  teams: {
    1: { name: 'Team 1', color: 'rgba(255, 0, 0, 0.4)', border: '#ff0000', players: {}, objectsLost: 0 },
    2: { name: 'Team 2', color: 'rgba(0, 128, 255, 0.4)', border: '#0080ff', players: {}, objectsLost: 0 },
    3: { name: 'Team 3', color: 'rgba(0, 255, 0, 0.4)', border: '#00ff00', players: {}, objectsLost: 0 },
    4: { name: 'Team 4', color: 'rgba(255, 255, 0, 0.4)', border: '#ffff00', players: {}, objectsLost: 0 },
    5: { name: 'Team 5', color: 'rgba(255, 0, 255, 0.4)', border: '#ff00ff', players: {}, objectsLost: 0 },
    6: { name: 'Team 6', color: 'rgba(0, 255, 255, 0.4)', border: '#00ffff', players: {}, objectsLost: 0 },
    7: { name: 'Team 7', color: 'rgba(255, 128, 0, 0.4)', border: '#ff8000', players: {}, objectsLost: 0 },
    8: { name: 'Team 8', color: 'rgba(128, 0, 255, 0.4)', border: '#8000ff', players: {}, objectsLost: 0 },
    9: { name: 'Team 9', color: 'rgba(255, 128, 128, 0.4)', border: '#ff8080', players: {}, objectsLost: 0 },
    0: { name: 'Team 10', color: 'rgba(128, 255, 128, 0.4)', border: '#80ff80', players: {}, objectsLost: 0 }
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
      this.teams[key] = { name: `Team ${i === 0 ? 10 : i}`, players: {}, objectsLost: 0 };
    }
  },

  // Get team's total land count
  getTeamLandCount(teamId) {
    return Object.values(this.land).filter(t => t === teamId).length;
  },

  // Get team's total gold (sum of all player gold)
  getTeamGold(teamId) {
    const team = this.teams[teamId];
    if (!team || !team.players) return 0;
    return Object.values(team.players).reduce((sum, p) => sum + (p.gold || 0), 0);
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
