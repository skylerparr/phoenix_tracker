import { postRequest, getRequest, putRequest, deleteRequest } from '../client.js';

export async function createIssue(title, token, options = {}) {
  if (!title) {
    throw new Error('Title is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  const payload = {
    title,
    priority: 1,
    status: 0,
    isIcebox: false,
    workType: options.workType,
    description: options.description,
    points: options.points,
    targetReleaseAt: options.targetReleaseAt,
  };

  return postRequest('/issues', payload, token, options, 'Create issue request failed');
}

export async function getIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest(`/issues/${issueId}`, token, options, 'Get issue request failed');
}

export async function updateIssue(issueId, updates, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/issues/${issueId}`, updates, token, options, 'Update issue request failed');
}

export async function deleteIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  await deleteRequest(`/issues/${issueId}`, token, options, 'Delete issue request failed');
}

export async function startIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/issues/${issueId}/start`, null, token, options, 'Start issue request failed');
}

export async function finishIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/issues/${issueId}/finish`, null, token, options, 'Finish issue request failed');
}

export async function deliverIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/issues/${issueId}/deliver`, null, token, options, 'Deliver issue request failed');
}

export async function acceptIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/issues/${issueId}/accept`, null, token, options, 'Accept issue request failed');
}

export async function rejectIssue(issueId, token, options = {}) {
  if (!issueId) {
    throw new Error('Issue ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return putRequest(`/issues/${issueId}/reject`, null, token, options, 'Reject issue request failed');
}

export async function getAllIssues(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/issues', token, options, 'Get all issues request failed');
}

export async function getMyIssues(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/issues/me', token, options, 'Get my issues request failed');
}

export async function getIssuesByTag(tagId, token, options = {}) {
  if (!tagId) {
    throw new Error('Tag ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest(`/issues/tag/${tagId}`, token, options, 'Get issues by tag request failed');
}

export async function getIssuesByUser(userId, token, options = {}) {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest(`/issues/user/${userId}`, token, options, 'Get issues by user request failed');
}

export async function getAllAccepted(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/issues/accepted', token, options, 'Get all accepted issues request failed');
}

export async function getAllIcebox(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/issues/icebox', token, options, 'Get all icebox issues request failed');
}

export async function getWeeklyPointsAverage(token, options = {}) {
  if (!token) {
    throw new Error('Token is required');
  }

  return getRequest('/issues/weekly-points-average', token, options, 'Get weekly points average request failed');
}

export default {
  createIssue,
  getIssue,
  updateIssue,
  deleteIssue,
  startIssue,
  finishIssue,
  deliverIssue,
  acceptIssue,
  rejectIssue,
  getAllIssues,
  getMyIssues,
  getIssuesByTag,
  getIssuesByUser,
  getAllAccepted,
  getAllIcebox,
  getWeeklyPointsAverage,
};
