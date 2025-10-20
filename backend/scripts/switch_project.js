#!/usr/bin/env node

import { createAgent } from './client.js';
import { login } from './login.js';
import { parseArgs, prettyPrint, die } from './cli.js';

export async function switchProjectCommand(email, projectId, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  const loginData = await login(email, { baseUrl, insecure, cacert });
  const baseToken = loginData.token;

  const switchData = await switchProject(baseToken, projectId, { baseUrl, insecure, cacert });

  return switchData;
}

export async function switchProject(baseToken, projectId, options = {}) {
  const { baseUrl, insecure, cacert } = options;
  if (!baseToken) {
    throw new Error('Base token is required');
  }

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const switchPayload = JSON.stringify({ projectId });
  const switchResp = await fetch(`${baseUrl}/auth/switch-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `${baseToken}`,
    },
    body: switchPayload,
    agent: createAgent(`${baseUrl}/auth/switch-project`, insecure, cacert),
  });

  if (!switchResp.ok) {
    throw new Error(`Switch-project request failed with status ${switchResp.status}`);
  }

  const switchData = await switchResp.json();
  const projectToken = switchData.token;

  if (!projectToken) {
    throw new Error('Failed to obtain project-scoped JWT token from /auth/switch-project');
  }

  return switchData;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('switch_project.js', {
    includeEmail: true,
    includeBaseUrl: true,
    includeProjectId: true,
    includeOutput: true,
    requireEmail: true,
    requireProjectId: true,
  });

  switchProjectCommand(config.email, config.projectId, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
