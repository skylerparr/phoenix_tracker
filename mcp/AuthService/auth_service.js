import { createAgent } from '../client.js';

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

export async function register(name, email, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!name || !email) {
    throw new Error('Name and email are required');
  }

  const registerPayload = JSON.stringify({ name, email });

  const registerResp = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: registerPayload,
    agent: createAgent(`${baseUrl}/auth/register`, insecure, cacert),
  });

  if (!registerResp.ok) {
    throw new Error(`Register request failed with status ${registerResp.status}`);
  }

  const registerData = await registerResp.json();

  if (!registerData.token) {
    throw new Error('Failed to obtain JWT token from /auth/register');
  }

  return registerData;
}

export async function logout(userId, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';
  const token = options.token || '';

  if (!userId) {
    throw new Error('User ID is required');
  }

  const logoutPayload = JSON.stringify({ user_id: userId });

  const logoutResp = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: logoutPayload,
    agent: createAgent(`${baseUrl}/auth/logout`, insecure, cacert),
  });

  if (!logoutResp.ok) {
    throw new Error(`Logout request failed with status ${logoutResp.status}`);
  }
}

export async function switchProject(projectId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const switchProjectPayload = JSON.stringify({ projectId: parseInt(projectId) });

  const switchProjectResp = await fetch(`${baseUrl}/auth/switch-project`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: switchProjectPayload,
    agent: createAgent(`${baseUrl}/auth/switch-project`, insecure, cacert),
  });

  if (!switchProjectResp.ok) {
    throw new Error(`Switch project request failed with status ${switchProjectResp.status}`);
  }

  const switchProjectData = await switchProjectResp.json();

  if (!switchProjectData.token) {
    throw new Error('Failed to obtain JWT token from /auth/switch-project');
  }

  return switchProjectData;
}

export default {
  login,
  register,
  logout,
  switchProject,
};
