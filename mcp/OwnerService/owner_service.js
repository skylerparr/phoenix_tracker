import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createOwner(userId, token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  const payload = { userId };
  return postRequest('/owners', payload, token, options, 'Create owner request failed');
}

export async function getAllOwners(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/owners', token, options, 'Get all owners request failed');
}

export async function getOwner(id, token, options = {}) {
  if (!id) throw new Error('Owner ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/owners/${id}`, token, options, 'Get owner request failed');
}

export async function updateOwner(id, userId, token, options = {}) {
  if (!id) throw new Error('Owner ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = { userId };
  return putRequest(`/owners/${id}`, payload, token, options, 'Update owner request failed');
}

export async function deleteOwner(id, token, options = {}) {
  if (!id) throw new Error('Owner ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/owners/${id}`, token, options, 'Delete owner request failed');
}

export default {
  createOwner,
  getAllOwners,
  getOwner,
  updateOwner,
  deleteOwner,
};