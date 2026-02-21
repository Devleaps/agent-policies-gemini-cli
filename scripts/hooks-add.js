#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const GEMINI_SETTINGS = path.join(os.homedir(), '.gemini', 'settings.json');
const GEMINI_EVENTS = ['BeforeTool', 'AfterTool'];
const CLIENT = `node "${path.resolve(__dirname, 'client.js')}"`;

function main() {
  console.log('Configuring Gemini CLI hooks...\n');

  let settings = {};
  try {
    if (fs.existsSync(GEMINI_SETTINGS)) {
      settings = JSON.parse(fs.readFileSync(GEMINI_SETTINGS, 'utf8'));
    }
  } catch (_) {}

  if (!settings.hooks) settings.hooks = {};
  settings.hooksEnabled = true;

  let changed = false;

  for (const event of GEMINI_EVENTS) {
    if (!settings.hooks[event]) settings.hooks[event] = [];
    const already = settings.hooks[event].some((h) => h.name === 'agent-policies');
    if (!already) {
      settings.hooks[event].push({ name: 'agent-policies', type: 'command', command: CLIENT });
      changed = true;
      console.log(`  ✓ ${event}`);
    }
  }

  if (changed) {
    fs.mkdirSync(path.dirname(GEMINI_SETTINGS), { recursive: true });
    fs.writeFileSync(GEMINI_SETTINGS, JSON.stringify(settings, null, 2));
    console.log(`\n✓ Saved to ${GEMINI_SETTINGS}`);
    console.log('Note: path is absolute. Re-run if you move this directory.');
  } else {
    console.log('✓ Already configured — no changes needed');
  }
}

main();
