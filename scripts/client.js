#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────

function loadConfig() {
  try {
    const raw = fs.readFileSync(path.join(os.homedir(), '.agent-policies', 'config.json'), 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return {};
  }
}

// ── HTTP ──────────────────────────────────────────────────────────────────────

function post(serverUrl, endpoint, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, serverUrl);
    const data = JSON.stringify(body);
    const lib = url.protocol === 'https:' ? https : http;

    const req = lib.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let buf = '';
        res.on('data', (chunk) => (buf += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: buf }));
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── Stdin ─────────────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve) => {
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => (buf += chunk));
    process.stdin.on('end', () => resolve(buf.trim()));
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();
  const serverUrl = config.server_url || 'https://agent-policies.devleaps.nl';
  const bundles = config.bundles || ['universal'];
  const defaultBehavior = config.default_policy_behavior || 'ask';

  let raw;
  try {
    raw = await readStdin();
  } catch (e) {
    process.stderr.write('Error reading stdin\n');
    process.exit(2);
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`Invalid JSON in hook payload: ${e.message}\n`);
    process.exit(2);
  }

  const hookEventName = payload.hook_event_name;
  if (!hookEventName) {
    process.stderr.write('Missing hook_event_name in payload\n');
    process.exit(2);
  }

  const endpoint = `/policy/gemini/${hookEventName}`;
  const body = { bundles, default_policy_behavior: defaultBehavior, event: payload };

  try {
    const { status, body: responseBody } = await post(serverUrl, endpoint, body);

    if (status !== 200) {
      process.stderr.write(`Policy server error: HTTP ${status}\n`);
      process.stderr.write(`Endpoint: ${endpoint}\n`);
      process.exit(2);
    }

    process.stdout.write(responseBody);
    process.exit(0);
  } catch (e) {
    if (e.code === 'ECONNREFUSED') {
      process.stderr.write(`Cannot connect to policy server at ${serverUrl}\n`);
      process.stderr.write(`Configure server_url in ~/.agent-policies/config.json\n`);
    } else {
      process.stderr.write(`Policy client error: ${e.message}\n`);
    }
    process.exit(2);
  }
}

main();
