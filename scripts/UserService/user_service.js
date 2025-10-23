import { createAgent } from '../client.js';

export async function createUser(name, email, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!name || !email) {
    throw new Error('Name and email are required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const createPayload = JSON.stringify({ name, email });

  const createResp = await fetch(`${baseUrl}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: createPayload,
    agent: createAgent(`${baseUrl}/users`, insecure, cacert),
  });

  if (!createResp.ok) {
    throw new Error(`Create user request failed with status ${createResp.status}`);
  }

  return createResp.json();
}

export async function getAllUsers(token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!token) {
    throw new Error('Token is required');
  }

  const getAllResp = await fetch(`${baseUrl}/users`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/users`, insecure, cacert),
  });

  if (!getAllResp.ok) {
    throw new Error(`Get all users request failed with status ${getAllResp.status}`);
  }

  return getAllResp.json();
}

export async function getUser(userId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const getResp = await fetch(`${baseUrl}/users/${userId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/users/${userId}`, insecure, cacert),
  });

  if (!getResp.ok) {
    throw new Error(`Get user request failed with status ${getResp.status}`);
  }

  return getResp.json();
}

export async function getUserByEmail(email, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!email) {
    throw new Error('Email is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const encodedEmail = encodeURIComponent(email);
  const getByEmailResp = await fetch(`${baseUrl}/users/by-email?email=${encodedEmail}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/users/by-email`, insecure, cacert),
  });

  if (!getByEmailResp.ok) {
    throw new Error(`Get user by email request failed with status ${getByEmailResp.status}`);
  }

  return getByEmailResp.json();
}

export async function updateUser(userId, updates, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const updatePayload = JSON.stringify(updates);

  const updateResp = await fetch(`${baseUrl}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: updatePayload,
    agent: createAgent(`${baseUrl}/users/${userId}`, insecure, cacert),
  });

  if (!updateResp.ok) {
    throw new Error(`Update user request failed with status ${updateResp.status}`);
  }

  return updateResp.json();
}

export async function deleteUser(userId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const deleteResp = await fetch(`${baseUrl}/users/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/users/${userId}`, insecure, cacert),
  });

  if (!deleteResp.ok) {
    throw new Error(`Delete user request failed with status ${deleteResp.status}`);
  }
}

export async function inviteUser(email, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!email) {
    throw new Error('Email is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const invitePayload = JSON.stringify({ email });

  const inviteResp = await fetch(`${baseUrl}/users/invite`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: invitePayload,
    agent: createAgent(`${baseUrl}/users/invite`, insecure, cacert),
  });

  if (!inviteResp.ok) {
    throw new Error(`Invite user request failed with status ${inviteResp.status}`);
  }

  return inviteResp.json();
}

export async function removeUser(userId, token, options = {}) {
  const baseUrl = options.baseUrl || process.env.BASE_URL || 'http://host.docker.internal:3001/api';
  const insecure = options.insecure || false;
  const cacert = options.cacert || '';

  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const removeResp = await fetch(`${baseUrl}/users/${userId}/remove`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    agent: createAgent(`${baseUrl}/users/${userId}/remove`, insecure, cacert),
  });

  if (!removeResp.ok) {
    throw new Error(`Remove user request failed with status ${removeResp.status}`);
  }
}

export default {
  createUser,
  getAllUsers,
  getUser,
  getUserByEmail,
  updateUser,
  deleteUser,
  inviteUser,
  removeUser,
};
