import { createAgent } from '../client.js';

export async function createProject(name, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!name) {
    throw new Error('Project name is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const createPayload = JSON.stringify({ name });

  const createResp = await fetch(`${baseUrl}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: createPayload,
    agent: createAgent(`${baseUrl}/projects`, insecure, cacert),
  });

  if (!createResp.ok) {
    throw new Error(`Create project request failed with status ${createResp.status}`);
  }

  return await createResp.json();
}

export async function getProject(id, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!id) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const getResp = await fetch(`${baseUrl}/projects/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/projects/${id}`, insecure, cacert),
  });

  if (!getResp.ok) {
    throw new Error(`Get project request failed with status ${getResp.status}`);
  }

  return await getResp.json();
}

export async function getAllProjectsByUserId(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const getAllResp = await fetch(`${baseUrl}/projects/user/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/projects/user/me`, insecure, cacert),
  });

  if (!getAllResp.ok) {
    throw new Error(`Get all projects request failed with status ${getAllResp.status}`);
  }

  return await getAllResp.json();
}

export async function deleteProject(id, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!id) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const deleteResp = await fetch(`${baseUrl}/projects/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/projects/${id}`, insecure, cacert),
  });

  if (!deleteResp.ok) {
    throw new Error(`Delete project request failed with status ${deleteResp.status}`);
  }
}

export async function selectProject(id, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!id) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const selectResp = await fetch(`${baseUrl}/projects/${id}/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/projects/${id}/user`, insecure, cacert),
  });

  if (!selectResp.ok) {
    throw new Error(`Select project request failed with status ${selectResp.status}`);
  }

  return await selectResp.json();
}

export default {
  createProject,
  getProject,
  getAllProjectsByUserId,
  deleteProject,
  selectProject,
};
