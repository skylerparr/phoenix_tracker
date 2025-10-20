import https from 'https';
import http from 'http';
import fs from 'fs';

export const createAgent = (url, insecure = false, cacert = '') => {
  const urlObj = new URL(url);
  if (urlObj.protocol === 'https:') {
    const agentOptions = {
      rejectUnauthorized: !insecure,
    };
    if (cacert) {
      try {
        agentOptions.ca = fs.readFileSync(cacert);
      } catch (e) {
        throw new Error(`Failed to read CA certificate: ${e.message}`);
      }
    }
    return new https.Agent(agentOptions);
  }
  return new http.Agent();
};

export async function fetchIssues(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const issuesResp = await fetch(`${baseUrl}/issues`, {
    method: 'GET',
    headers: { 'Authorization': `${token}` },
    agent: createAgent(`${baseUrl}/issues`, insecure, cacert),
  });

  if (!issuesResp.ok) {
    throw new Error(`Failed to fetch issues with status ${issuesResp.status}`);
  }

  const text = await issuesResp.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
