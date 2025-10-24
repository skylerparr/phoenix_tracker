import { postRequest } from '../client.js';

export async function login(email, options = {}) {
  if (!email) {
    throw new Error('Email is required');
  }

  const loginData = await postRequest('/auth/login', { email }, '', options, 'Login request failed');

  if (!loginData.token) {
    throw new Error('Failed to obtain JWT token from /auth/login');
  }

  return loginData;
}

export async function register(name, email, options = {}) {
  if (!name || !email) {
    throw new Error('Name and email are required');
  }

  const registerData = await postRequest('/auth/register', { name, email }, '', options, 'Register request failed');

  if (!registerData.token) {
    throw new Error('Failed to obtain JWT token from /auth/register');
  }

  return registerData;
}

export async function logout(userId, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const token = options.token || '';
  await postRequest('/auth/logout', { user_id: userId }, token, options, 'Logout request failed');
}

export async function switchProject(projectId, token, options = {}) {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const switchProjectData = await postRequest('/auth/switch-project', { projectId: parseInt(projectId) }, token, options, 'Switch project request failed');

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
