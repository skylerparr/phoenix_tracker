import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createTag(name, isEpic, token, options = {}) {
  if (!name) throw new Error('Name is required');
  if (typeof isEpic !== 'boolean') throw new Error('isEpic must be a boolean');
  if (!token) throw new Error('Token is required');
  
  const payload = { name, isEpic };
  return postRequest('/tags', payload, token, options, 'Create tag request failed');
}

export async function getAllTags(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/tags', token, options, 'Get all tags request failed');
}

export async function getTag(id, token, options = {}) {
  if (!id) throw new Error('Tag ID is required');
  if (!token) throw new Error('Token is required');
  
  return getRequest(`/tags/${id}`, token, options, 'Get tag request failed');
}

export async function updateTag(id, name, isEpic, token, options = {}) {
  if (!id) throw new Error('Tag ID is required');
  if (!token) throw new Error('Token is required');
  
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (isEpic !== undefined) payload.isEpic = isEpic;
  
  return putRequest(`/tags/${id}`, payload, token, options, 'Update tag request failed');
}

export async function deleteTag(id, token, options = {}) {
  if (!id) throw new Error('Tag ID is required');
  if (!token) throw new Error('Token is required');
  
  await deleteRequest(`/tags/${id}`, token, options, 'Delete tag request failed');
}

export async function getTagsWithCounts(token, options = {}) {
  if (!token) throw new Error('Token is required');
  
  return getRequest('/tags/counts', token, options, 'Get tags with counts request failed');
}

export default {
  createTag,
  getAllTags,
  getTag,
  updateTag,
  deleteTag,
  getTagsWithCounts,
};