import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createUser(name, email, token, options = {}) {
  if (!name || !email) {
    throw new Error('Name and email are required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return postRequest('/users', { name, email }, token, options, 'Create user request failed');
}

export async function getAllUsers(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/users', token, options, 'Get all users request failed');
}

export async function getUser(userId, token, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest(`/users/${userId}`, token, options, 'Get user request failed');
}

export async function getUserByEmail(email, token, options = {}) {
  if (!email) {
    throw new Error('Email is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const encodedEmail = encodeURIComponent(email);
  return getRequest(`/users/by-email?email=${encodedEmail}`, token, options, 'Get user by email request failed');
}

export async function updateUser(userId, updates, token, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/users/${userId}`, updates, token, options, 'Update user request failed');
}

export async function deleteUser(userId, token, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  await deleteRequest(`/users/${userId}`, token, options, 'Delete user request failed');
}

export async function inviteUser(email, token, options = {}) {
  if (!email) {
    throw new Error('Email is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return postRequest('/users/invite', { email }, token, options, 'Invite user request failed');
}

export async function removeUser(userId, token, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  await deleteRequest(`/users/${userId}/remove`, token, options, 'Remove user request failed');
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
