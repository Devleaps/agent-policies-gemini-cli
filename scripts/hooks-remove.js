#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

const GEMINI_SETTINGS = path.join(os.homedir(), '.gemini', 'settings.json');
const GEMINI_EVENTS = ['BeforeTool', 'AfterTool'];

function main() {
  console.log('Removing Gemini CLI hooks...\n');

  if (!fs.existsSync(GEMINI_SETTINGS)) {
    console.log('✓ No Gemini CLI configuration found — nothing to do');
    return;
  }

  let settings;
  try {
    settings = JSON.parse(fs.readFileSync(GEMINI_SETTINGS, 'utf8'));
  } catch (_) {
    console.error(`Could not parse ${GEMINI_SETTINGS}`);
    process.exit(1);
  }

  if (!settings.hooks) {
    console.log('✓ No hooks configured — nothing to do');
    return;
  }

  let changed = false;

  for (const event of GEMINI_EVENTS) {
    if (!settings.hooks[event]) continue;
    const before = settings.hooks[event].length;
    settings.hooks[event] = settings.hooks[event].filter((h) => h.name !== 'agent-policies');
    if (settings.hooks[event].length < before) {
      changed = true;
      console.log(`  ✓ Removed ${event}`);
    }
  }

  if (changed) {
    fs.writeFileSync(GEMINI_SETTINGS, JSON.stringify(settings, null, 2));
    console.log(`\n✓ Saved to ${GEMINI_SETTINGS}`);
  } else {
    console.log('✓ No agent-policies hooks found — nothing to do');
  }
}

main();
