import { postRequest, getRequest, deleteRequest } from '../client.js';

export async function createProject(name, token, options = {}) {
  if (!name) {
    throw new Error('Project name is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return postRequest('/projects', { name }, token, options, 'Create project request failed');
}

export async function getProject(id, token, options = {}) {
  if (!id) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest(`/projects/${id}`, token, options, 'Get project request failed');
}

export async function getAllProjectsByUserId(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/projects/user/me', token, options, 'Get all projects request failed');
}

export async function deleteProject(id, token, options = {}) {
  if (!id) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  await deleteRequest(`/projects/${id}`, token, options, 'Delete project request failed');
}

export async function selectProject(id, token, options = {}) {
  if (!id) {
    throw new Error('Project ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return postRequest(`/projects/${id}/user`, {}, token, options, 'Select project request failed');
}

export default {
  createProject,
  getProject,
  getAllProjectsByUserId,
  deleteProject,
  selectProject,
};
