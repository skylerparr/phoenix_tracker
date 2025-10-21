#!/usr/bin/env node

import { createAgent } from './client.js';
import { parseArgs, prettyPrint, die } from './cli.js';
import { login } from './login.js';
import { switchProject } from './switch_project.js';

export async function fetchBacklogCommand(email, projectId, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  const loginData = await login(email, { baseUrl, insecure, cacert });
  const baseToken = loginData.token;

  const switchData = await switchProject(baseToken, projectId, { baseUrl, insecure, cacert });
  const projectToken = switchData.token;
  const backlogData = await fetchBacklog(projectToken, { baseUrl, insecure, cacert });

  return backlogData;
}

export async function fetchBacklog(token, options = {}) {
  const { baseUrl, insecure, cacert } = options;
  if (!token) {
    throw new Error('Token is required');
  }

  const issuesResp = await fetch(`${baseUrl}/issues`, {
    method: 'GET',
    'Content-Type': 'application/json',
    headers: { 'Authorization': `${token}` },
    agent: createAgent(`${baseUrl}/issues`, insecure, cacert),
  });

  if (!issuesResp.ok) {
    throw new Error(`Failed to fetch backlog with status ${issuesResp.status}`);
  }

  const text = await issuesResp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export default fetchBacklog;

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = parseArgs('fetch_backlog.js', {
    includeEmail: true,
    includeBaseUrl: true,
    includeOutput: true,
    requireEmail: true,
  });

  fetchBacklogCommand(config.email, config.projectId, { baseUrl: config.baseUrl, insecure: config.insecure, cacert: config.cacert })
    .then((data) => prettyPrint(data, config.output))
    .catch((e) => die(e.message || e));
}
