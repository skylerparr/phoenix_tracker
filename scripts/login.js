import { createAgent } from './client.js';
import { parseArgs, prettyPrint, die } from './cli.js';

export async function login(email, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!email) {
    throw new Error('Email is required');
  }

  const loginPayload = JSON.stringify({ email });

  const loginResp = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginPayload,
    agent: createAgent(`${baseUrl}/auth/login`, insecure, cacert),
  });

  if (!loginResp.ok) {
    throw new Error(`Login request failed with status ${loginResp.status}`);
  }

  const loginData = await loginResp.json();

  if (!loginData.token) {
    throw new Error('Failed to obtain JWT token from /auth/login');
  }

  return loginData;
}

export default login;

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('login.js', {
    includeEmail: true,
    includeBaseUrl: true,
    includeOutput: true,
    requireEmail: true,
  });

  login(config.email, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
