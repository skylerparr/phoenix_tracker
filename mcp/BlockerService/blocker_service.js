import { postRequest, getRequest, deleteRequest } from '../client.js';

/**
 * @typedef {import('../../frontend/src/models/Blocker.tsx').Blocker} Blocker
 */

export async function createBlocker(blockerId, blockedId, token, options = {}) {
  if (!blockerId || !blockedId) throw new Error('blockerId and blockedId are required');
  if (!token) throw new Error('Token is required');
  const payload = { blockerId, blockedId };
  return postRequest('/blockers', payload, token, options, 'Create blocker request failed');
}

export async function getBlockerIssues(blockerId, token, options = {}) {
  if (!blockerId) throw new Error('blockerId is required');
  if (!token) throw new Error('Token is required');
  return getRequest(`/blockers/blocker/${blockerId}`, token, options, 'Get blocker issues request failed');
}

export async function getBlockedIssues(blockedId, token, options = {}) {
  if (!blockedId) throw new Error('blockedId is required');
  if (!token) throw new Error('Token is required');
  return getRequest(`/blockers/blocked/${blockedId}`, token, options, 'Get blocked issues request failed');
}

export async function deleteBlocker(blockerId, blockedId, token, options = {}) {
  if (!blockerId || !blockedId) throw new Error('blockerId and blockedId are required');
  if (!token) throw new Error('Token is required');
  return deleteRequest(`/blockers/${blockerId}/${blockedId}`, token, options, 'Delete blocker request failed');
}

export default {
  createBlocker,
  getBlockerIssues,
  getBlockedIssues,
  deleteBlocker,
};
