const fs = require('fs');
const path = require('path');

const DIR = process.env.INTEGRATION_STORAGE_DIR || path.join(process.cwd(), 'backend-nodejs', 'services', 'integration', '.storage');
const EVENTS = path.join(DIR, 'events.jsonl');
const DEAD = path.join(DIR, 'dead_letter.jsonl');

function ensureDir() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
}

class EventLog {
  constructor() {
    ensureDir();
  }

  async append(obj) {
    const line = JSON.stringify(obj) + '\n';
    await fs.promises.appendFile(EVENTS, line, 'utf8');
  }

  async deadLetter(obj) {
    const line = JSON.stringify(obj) + '\n';
    await fs.promises.appendFile(DEAD, line, 'utf8');
  }
}

module.exports = { EventLog };
