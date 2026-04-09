import fs from 'fs';
import os from 'os';
import path from 'path';

const CONFIG_DIR = path.join(os.homedir(), '.readminator');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Ensure the config directory exists.
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Save configuration to ~/.readminator/config.json
 * @param {object} config
 */
export function saveConfig(config) {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Load configuration from ~/.readminator/config.json
 * Throws if the config does not exist or is invalid.
 * @returns {object}
 */
export function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    throw new Error(
      'No configuration found. Run `readminator setup` first.'
    );
  }
  const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Returns true if a config file already exists.
 * @returns {boolean}
 */
export function configExists() {
  return fs.existsSync(CONFIG_FILE);
}

/**
 * Return the config file path (useful for user info messages).
 * @returns {string}
 */
export function configPath() {
  return CONFIG_FILE;
}
