const fs = require('fs').promises;
const path = require('path');

const SAVE_FILE = path.join(__dirname, '..', 'save.json');

async function saveGame(data) {
  try {
    await fs.writeFile(SAVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function loadGame() {
  try {
    const data = await fs.readFile(SAVE_FILE, 'utf-8');
    return { success: true, data: JSON.parse(data) };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { success: true, data: null };
    }
    return { success: false, error: error.message };
  }
}

module.exports = {
  saveGame,
  loadGame
};
